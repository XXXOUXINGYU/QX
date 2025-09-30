const https = require('https');
const http = require('http');
const fs = require('fs');
const { URL } = require('url');

// RnlRequest 类
class RnlRequest {
    constructor(cookies) {
        this.cookies = {};
        this.baseHeaders = {
            'Host': 'm.jr.airstarfinance.net',
            'User-Agent': 'Mozilla/5.0 (Linux; U; Android 14; zh-CN; M2012K11AC Build/UKQ1.230804.001; AppBundle/com.mipay.wallet; AppVersionName/6.89.1.5275.2323; AppVersionCode/20577595; MiuiVersion/stable-V816.0.13.0.UMNCNXM; DeviceId/alioth; NetworkType/WIFI; mix_version; WebViewVersion/118.0.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Mobile Safari/537.36 XiaoMi/MiuiBrowser/4.3',
        };
        this.updateCookies(cookies);
    }

    // 发送HTTP请求
    async request(method, url, options = {}) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const isHttps = urlObj.protocol === 'https:';
            const client = isHttps ? https : http;

            const headers = { ...this.baseHeaders, ...options.headers };
            if (this.getCookieString()) {
                headers['Cookie'] = this.getCookieString();
            }

            let postData = '';
            if (options.data) {
                if (typeof options.data === 'string') {
                    postData = options.data;
                } else {
                    postData = new URLSearchParams(options.data).toString();
                }
                headers['Content-Type'] = 'application/x-www-form-urlencoded';
                headers['Content-Length'] = Buffer.byteLength(postData);
            } else if (options.json) {
                postData = JSON.stringify(options.json);
                headers['Content-Type'] = 'application/json';
                headers['Content-Length'] = Buffer.byteLength(postData);
            }

            const requestOptions = {
                hostname: urlObj.hostname,
                port: urlObj.port || (isHttps ? 443 : 80),
                path: urlObj.pathname + urlObj.search,
                method: method.toUpperCase(),
                headers: headers,
                rejectUnauthorized: false
            };

            const req = client.request(requestOptions, (res) => {
                // 处理cookies
                const setCookies = res.headers['set-cookie'];
                if (setCookies) {
                    setCookies.forEach(cookie => {
                        const parts = cookie.split(';')[0].split('=');
                        if (parts.length === 2) {
                            this.cookies[parts[0].trim()] = parts[1].trim();
                        }
                    });
                }

                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const jsonData = JSON.parse(data);
                        resolve(jsonData);
                    } catch (e) {
                        logger.log(`[JSON解析错误] ${e.message}`, 'error');
                        resolve(null);
                    }
                });
            });

            req.on('error', (e) => {
                logger.log(`[请求错误] ${e.message}`, 'error');
                resolve(null);
            });

            if (postData) {
                req.write(postData);
            }
            req.end();
        });
    }

    updateCookies(cookies) {
        if (cookies) {
            if (typeof cookies === 'string') {
                const parsedCookies = this.parseCookies(cookies);
                this.cookies = { ...this.cookies, ...parsedCookies };
            } else {
                this.cookies = { ...this.cookies, ...cookies };
            }
        }
    }

    parseCookies(cookiesStr) {
        const cookies = {};
        cookiesStr.split(';').forEach(item => {
            const trimmed = item.trim();
            const equalIndex = trimmed.indexOf('=');
            if (equalIndex > 0) {
                const key = trimmed.substring(0, equalIndex).trim();
                const value = trimmed.substring(equalIndex + 1).trim();
                if (key && value) {
                    cookies[key] = value;
                }
            }
        });
        return cookies;
    }

    getCookieString() {
        return Object.entries(this.cookies)
            .map(([key, value]) => `${key}=${value}`)
            .join('; ');
    }

    async get(url, options = {}) {
        return this.request('GET', url, options);
    }

    async post(url, options = {}) {
        return this.request('POST', url, options);
    }
}

// RNL 类
class RNL {
    constructor(cookies) {
        this.tId = null;
        this.options = {
            taskList: true,
            completeTask: true,
            receiveAward: true,
            taskItem: true,
            userJoin: true,
        };
        this.activityCode = '2211-videoWelfare';
        this.rr = new RnlRequest(cookies);
    }

    // 随机等待
    async randomWait(minSeconds, maxSeconds) {
        const waitTime = Math.floor(Math.random() * (maxSeconds - minSeconds + 1)) + minSeconds;
        logger.log(`随机等待${waitTime}秒...`);
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
    }

    // 获取任务列表
    async getTaskList() {
        const data = {
            activityCode: this.activityCode,
        };
        try {
            const response = await this.rr.post(
                'https://m.jr.airstarfinance.net/mp/api/generalActivity/getTaskList',
                { data }
            );
            if (response && response.code !== 0) {
                logger.log(`获取任务列表失败: ${JSON.stringify(response)}`, 'error');
                return null;
            }
            const targetTasks = [];
            for (const task of response.value.taskInfoList) {
                if (task.taskName.includes('浏览组浏览任务')) {
                    targetTasks.push(task);
                }
            }
            logger.log("获取任务列表成功。");
            return targetTasks;
        } catch (e) {
            logger.log(`获取任务列表异常：${e.message}`, 'error');
            return null;
        }
    }

    // 获取任务信息
    async getTask(taskCode) {
        try {
            const data = {
                activityCode: this.activityCode,
                taskCode: taskCode,
                jrairstar_ph: '98lj8puDf9Tu/WwcyMpVyQ==',
            };
            const response = await this.rr.post(
                'https://m.jr.airstarfinance.net/mp/api/generalActivity/getTask',
                { data }
            );
            if (response && response.code !== 0) {
                logger.log(`获取任务信息失败：${JSON.stringify(response)}`, 'error');
                return null;
            }
            logger.log("获取任务信息成功。");
            return response.value.taskInfo.userTaskId;
        } catch (e) {
            logger.log(`获取任务信息异常：${e.message}`, 'error');
            return null;
        }
    }

    // 完成任务
    async completeTask(taskId, tId, browsClickUrlId) {
        try {
            const url = `https://m.jr.airstarfinance.net/mp/api/generalActivity/completeTask?activityCode=${this.activityCode}&app=com.mipay.wallet&isNfcPhone=true&channel=mipay_indexicon_TVcard&deviceType=2&system=1&visitEnvironment=2&userExtra=%7B%22platformType%22:1,%22com.miui.player%22:%224.27.0.4%22,%22com.miui.video%22:%22v2024090290(MiVideo-UN)%22,%22com.mipay.wallet%22:%226.83.0.5175.2256%22%7D&taskId=${taskId}&browsTaskId=${tId}&browsClickUrlId=${browsClickUrlId}&clickEntryType=undefined&festivalStatus=0`;
            const response = await this.rr.get(url);
            if (response && response.code !== 0) {
                logger.log(`完成任务失败：${JSON.stringify(response)}`, 'error');
                return null;
            }
            logger.log("完成任务成功。");
            return response.value;
        } catch (e) {
            logger.log(`完成任务异常：${e.message}`, 'error');
            return null;
        }
    }

    // 领取奖励
    async receiveAward(userTaskId) {
        try {
            const url = `https://m.jr.airstarfinance.net/mp/api/generalActivity/luckDraw?imei=&device=manet&appLimit=%7B%22com.qiyi.video%22:false,%22com.youku.phone%22:true,%22com.tencent.qqlive%22:true,%22com.hunantv.imgo.activity%22:true,%22com.cmcc.cmvideo%22:false,%22com.sankuai.meituan%22:true,%22com.anjuke.android.app%22:false,%22com.tal.abctimelibrary%22:false,%22com.lianjia.beike%22:false,%22com.kmxs.reader%22:true,%22com.jd.jrapp%22:false,%22com.smile.gifmaker%22:true,%22com.kuaishou.nebula%22:false%7D&activityCode=${this.activityCode}&userTaskId=${userTaskId}&app=com.mipay.wallet&isNfcPhone=true&channel=mipay_indexicon_TVcard&deviceType=2&system=1&visitEnvironment=2&userExtra=%7B%22platformType%22:1,%22com.miui.player%22:%224.27.0.4%22,%22com.miui.video%22:%22v2024090290(MiVideo-UN)%22,%22com.mipay.wallet%22:%226.83.0.5175.2256%22%7D`;
            const response = await this.rr.get(url);
            if (response && response.code !== 0) {
                logger.log(`领取奖励失败：${JSON.stringify(response)}`, 'error');
                return false;
            }
            logger.log("领取奖励成功。");
            return true;
        } catch (e) {
            logger.log(`领取奖励异常：${e.message}`, 'error');
            return false;
        }
    }

    // 查询用户参与记录
    async queryUserJoinListAndQueryUserGoldRichSum() {
        try {
            const totalRes = await this.rr.get('https://m.jr.airstarfinance.net/mp/api/generalActivity/queryUserGoldRichSum?app=com.mipay.wallet&deviceType=2&system=1&visitEnvironment=2&userExtra={"platformType":1,"com.miui.player":"4.27.0.4","com.miui.video":"v2024090290(MiVideo-UN)","com.mipay.wallet":"6.83.0.5175.2256"}&activityCode=2211-videoWelfare');
            if (!totalRes || totalRes.code !== 0) {
                logger.log(`获取兑换视频天数失败：${JSON.stringify(totalRes)}`, 'error');
                return false;
            }
            const total = totalRes ? `${(parseInt(totalRes.value) / 100).toFixed(2)}天` : "未知";

            const response = await this.rr.get(
                `https://m.jr.airstarfinance.net/mp/api/generalActivity/queryUserJoinList?&userExtra=%7B%22platformType%22:1,%22com.miui.player%22:%224.27.0.4%22,%22com.miui.video%22:%22v2024090290(MiVideo-UN)%22,%22com.mipay.wallet%22:%226.83.0.5175.2256%22%7D&activityCode=${this.activityCode}&pageNum=1&pageSize=20`
            );
            if (!response || response.code !== 0) {
                logger.log(`查询任务完成记录失败：${JSON.stringify(response)}`, 'error');
                return false;
            }

            const historyList = response.value.data;
            const currentDate = new Date().toISOString().split('T')[0];
            logger.log(`当前用户兑换视频天数：${total}`);
            logger.log(`------------ ${currentDate} 当天任务记录 ------------`);

            let foundTodayRecord = false;
            for (const a of historyList) {
                const recordTime = a.createTime;
                const recordDate = recordTime.substring(0, 10);
                if (recordDate === currentDate) {
                    const days = parseInt(a.value) / 100;
                    logger.log(`${recordTime} 领到视频会员，+${days.toFixed(2)}天`);
                    foundTodayRecord = true;
                }
            }

            if (!foundTodayRecord) {
                logger.log("今天暂无新的任务完成记录。");
            }

            return true;
        } catch (e) {
            logger.log(`获取任务记录异常：${e.message}`, 'error');
            return false;
        }
    }

    // 主流程
    async main() {
        logger.log("开始执行任务...");

        // 检查是否成功获取任务记录
        if (!await this.queryUserJoinListAndQueryUserGoldRichSum()) {
            return false;
        }

        // 修改为2次循环
        for (let i = 0; i < 2; i++) {
            logger.log(`--- 正在执行第 ${i + 1} 个任务循环 ---`);

            // 获取任务列表
            const tasks = await this.getTaskList();
            if (!tasks) {
                return false;
            }
            const task = tasks[0];

            let tId;
            try {
                tId = task.generalActivityUrlInfo.id;
                this.tId = tId;
            } catch {
                tId = this.tId;
            }
            const taskId = task.taskId;
            const taskCode = task.taskCode;
            const browsClickUrlId = task.generalActivityUrlInfo.browsClickUrlId;

            // 随机等待13-16秒以完成任务浏览
            await this.randomWait(13, 16);

            // 完成任务
            let userTaskId = await this.completeTask(tId, taskId, browsClickUrlId);

            if (!userTaskId) {
                logger.log("尝试重新获取任务数据以领取奖励...");
                userTaskId = await this.getTask(taskCode);
                if (!userTaskId) {
                    return false;
                }
            }

            // 随机等待2-4秒
            await this.randomWait(2, 4);

            // 领取奖励
            if (!await this.receiveAward(userTaskId)) {
                return false;
            }

            // 随机等待2-4秒
            await this.randomWait(2, 4);
        }

        // 记录
        await this.queryUserJoinListAndQueryUserGoldRichSum();
        logger.log("所有任务执行完毕。");
        return true;
    }
}

// Logger 类
class Logger {
    constructor(logFile = 'xiaomi_wallet_log_v2.txt') {
        this.logFile = logFile;
    }

    log(message, level = 'info') {
        const timestamp = new Date().toLocaleString('zh-CN', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).replace(/\//g, '-');
        const logMessage = `[${timestamp}][${level.toUpperCase()}] ${message}`;

        // 打印到控制台
        console.log(logMessage);

        // 写入日志文件
        try {
            fs.appendFileSync(this.logFile, logMessage + '\n', 'utf8');
        } catch (e) {
            console.log(`无法写入日志文件: ${e.message}`);
        }
    }
}

// 获取小米Cookie
async function getXiaomiCookies(passToken, userId) {
    const loginUrl = 'https://account.xiaomi.com/pass/serviceLogin?callback=https%3A%2F%2Fapi.jr.airstarfinance.net%2Fsts%3Fsign%3D1dbHuyAmee0NAZ2xsRw5vhdVQQ8%253D%26followup%3Dhttps%253A%252F%252Fm.jr.airstarfinance.net%252Fmp%252Fapi%252Flogin%253Ffrom%253Dmipay_indexicon_TVcard%2526deepLinkEnable%253Dfalse%2526requestUrl%253Dhttps%25253A%25252F%25252Fm.jr.airstarfinance.net%25252Fmp%25252Factivity%25252FvideoActivity%25253Ffrom%25253Dmipay_indexicon_TVcard%252526_noDarkMode%25253Dtrue%252526_transparentNaviBar%25253Dtrue%252526cUserId%25253Dusyxgr5xjumiQLUoAKTOgvi858Q%252526_statusBarHeight%25253D137&sid=jrairstar&_group=DEFAULT&_snsNone=true&_loginType=ticket';
    
    const allCookies = {};
    const initialCookie = `passToken=${passToken}; userId=${userId};`;

    // 递归跟随重定向
    function followRedirect(url, cookieStr, depth = 0) {
        if (depth > 10) {
            // 防止无限重定向
            return Promise.resolve(null);
        }

        return new Promise((resolve) => {
            const urlObj = new URL(url);
            const isHttps = urlObj.protocol === 'https:';
            const client = isHttps ? https : http;

            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || (isHttps ? 443 : 80),
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: {
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 Edg/135.0.0.0',
                    'cookie': cookieStr
                },
                rejectUnauthorized: false
            };

            const req = client.request(options, (res) => {
                // 收集所有的cookies
                const setCookies = res.headers['set-cookie'];
                if (setCookies) {
                    setCookies.forEach(cookie => {
                        const parts = cookie.split(';')[0].split('=');
                        if (parts.length === 2) {
                            allCookies[parts[0].trim()] = parts[1].trim();
                        }
                    });
                }

                // 更新cookie字符串
                const newCookieStr = Object.entries(allCookies)
                    .map(([key, value]) => `${key}=${value}`)
                    .join('; ');

                // 处理重定向
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    let redirectUrl = res.headers.location;
                    
                    // 处理相对路径
                    if (!redirectUrl.startsWith('http')) {
                        if (redirectUrl.startsWith('/')) {
                            redirectUrl = `${urlObj.protocol}//${urlObj.hostname}${redirectUrl}`;
                        } else {
                            redirectUrl = `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}/${redirectUrl}`;
                        }
                    }

                    res.on('data', () => {});
                    res.on('end', () => {
                        // 继续跟随重定向
                        followRedirect(redirectUrl, newCookieStr, depth + 1).then(resolve);
                    });
                } else {
                    // 读取响应体（虽然我们不需要它）
                    res.on('data', () => {});
                    res.on('end', () => {
                        resolve(allCookies);
                    });
                }
            });

            req.on('error', (e) => {
                logger.log(`获取Cookie请求失败: ${e.message}`, 'error');
                resolve(null);
            });

            req.end();
        });
    }

    try {
        const cookies = await followRedirect(loginUrl, initialCookie);
        if (!cookies || !cookies.cUserId) {
            return null;
        }
        return `cUserId=${cookies.cUserId};jrairstar_serviceToken=${cookies.serviceToken}`;
    } catch (e) {
        logger.log(`获取Cookie失败: ${e.message}`, 'error');
        return null;
    }
}

// 获取执行次数
function getExecutionCount() {
    const filePath = "run_count_v2.txt";
    if (fs.existsSync(filePath)) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            return parseInt(content.trim()) || 0;
        } catch {
            return 0;
        }
    }
    return 0;
}

// 更新执行次数
function updateExecutionCount(count) {
    const filePath = "run_count_v2.txt";
    try {
        fs.writeFileSync(filePath, String(count + 1), 'utf8');
    } catch (e) {
        logger.log(`无法更新执行次数文件: ${e.message}`, 'error');
    }
}

// 主程序
const logger = new Logger();

async function main() {
    // 获取并更新执行次数
    const runCount = getExecutionCount() + 1;
    updateExecutionCount(runCount);

    logger.log(`脚本v2已执行 ${runCount} 次`, 'info');
    logger.log(">>>>>>>>>> 脚本v2开始执行 <<<<<<<<<<");

    // 多账号配置区 ##################################
    const ORIGINAL_COOKIES = [
        {   // 账号1
            passToken: 'V1:J7rrshrufaw8uWrlTMO7x1oEssq3KSjm0vRDBu2tDhm3uV/L5TrGDIdJx85mIDEZcm4qLqu6tplq3Nzwwye/rAwz1Dc3CBfv2Xp8Yvpz+SGcs386uPCShdBgXpMwaNMCIz1dPYqk9Ic3IGteU3uhQHBZ6un+fp1fBEeSA9YnrOsEOBStRgpS0vcKcrQrbWhuKAiv8O31ZnXsTJRci1XCAoycH1thpMbovZf4q3WV6fvW/Wc4ky7u8nJjY+zRe3xGlQKuMXfz7C0U+U3vp0LzYyORuRqlxx1ptOIXPHU9sthkpZ7Qul9M10fbevC/zWYK/zh4xnafBhWXurJPdcqaIA==',
            userId: '3035180589'
        },
        {   // 账号2
            passToken: 'V1:J7rrshrufaw8uWrlTMO7x1oEssq3KSjm0vRDBu2tDhm3uV/L5TrGDIdJx85mIDEZcm4qLqu6tplq3Nzwwye/rAwz1Dc3CBfv2Xp8Yvpz+SGcs386uPCShdBgXpMwaNMCIz1dPYqk9Ic3IGteU3uhQHBZ6un+fp1fBEeSA9YnrOsEOBStRgpS0vcKcrQrbWhuKAiv8O31ZnXsTJRci1XCAoycH1thpMbovZf4q3WV6fvW/Wc4ky7u8nJjY+zRe3xGlQKuMXfz7C0U+U3vp0LzYyORuRqlxx1ptOIXPHU9sthkpZ7Qul9M10fbevC/zWYK/zh4xnafBhWXurJPdcqaIA==',
            userId: '3035180589'
        }
        // 可继续添加更多账号...
    ];
    // 结束配置 ######################################

    const cookieList = [];
    for (const account of ORIGINAL_COOKIES) {
        if (!account.passToken || account.passToken === 'xxxxx') {
            logger.log("⚠️ 检测到账号配置为空，跳过此账号。");
            continue;
        }

        logger.log(`\n>>>>>>>>>> 正在处理账号 ${account.userId} <<<<<<<<<<`);
        const newCookie = await getXiaomiCookies(account.passToken, account.userId);
        if (newCookie) {
            cookieList.push(newCookie);
            logger.log(`✅ 账号 ${account.userId} Cookie获取成功`);
        } else {
            logger.log(`❌ 账号 ${account.userId} Cookie获取失败，请检查配置`);
        }
    }

    logger.log(`\n>>>>>>>>>> 共获取到${cookieList.length}个有效Cookie <<<<<<<<<<`);

    for (let index = 0; index < cookieList.length; index++) {
        const c = cookieList[index];
        logger.log(`\n--------- 开始执行第${index + 1}个账号 ---------`);
        try {
            const rnl = new RNL(c);
            const success = await rnl.main();
            if (success) {
                logger.log(`✅ 第${index + 1}个账号任务执行成功！`);
            } else {
                logger.log(`❌ 第${index + 1}个账号任务执行失败。`, 'error');
            }
        } catch (e) {
            logger.log(`⚠️ 第${index + 1}个账号执行异常: ${e.message}`, 'error');
        }
        logger.log(`--------- 第${index + 1}个账号执行结束 ---------`);
    }

    logger.log("\n>>>>>>>>>> 脚本v2执行完毕 <<<<<<<<<<");
}

// 执行主程序
main().catch(e => {
    logger.log(`程序执行出错: ${e.message}`, 'error');
    console.error(e);
});
