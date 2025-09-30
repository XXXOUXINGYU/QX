/*
 * Quantumult X 小米钱包视频会员任务脚本
 * * @author Gemini & YourUsername
 * 脚本功能: 自动完成小米钱包中的视频福利任务以获取视频会员天数。
 * * 更新日志:
 * v1.0.0 - 初始版本，使用 $task.fetch API 重写。
 * * 配置说明:
 * 1. 将此脚本(.js文件)保存到 Quantumult X 的脚本目录 (通常是 iCloud/Quantumult X/Scripts)。
 * 2. 在 Quantumult X 配置文件的 [task_local] 部分添加如下配置:
 * // 每天早上8点30分执行一次
 * 30 8 * * * https://raw.githubusercontent.com/your/repo/xiaomi_task.js, tag=小米视频会员, img-url=mi.system, enabled=true
 * (注意: 请将上面的 URL 替换为你自己的脚本链接)
 * 3. 在下面的 `ORIGINAL_COOKIES` 数组中填入你的账号信息。
 */

// #################### 用户配置区 ####################
// 在这里填入你的小米账号的 passToken 和 userId
// 可添加多个账号
const ORIGINAL_COOKIES = [
    {   // 账号1
        'passToken': 'V1:J7rrshrufaw8uWrlTMO7x1oEssq3KSjm0vRDBu2tDhm3uV/L5TrGDIdJx85mIDEZcm4qLqu6tplq3Nzwwye/rAwz1Dc3CBfv2Xp8Yvpz+SGcs386uPCShdBgXpMwaNMCIz1dPYqk9Ic3IGteU3uhQHBZ6un+fp1fBEeSA9YnrOsEOBStRgpS0vcKcrQrbWhuKAiv8O31ZnXsTJRci1XCAoycH1thpMbovZf4q3WV6fvW/Wc4ky7u8nJjY+zRe3xGlQKuMXfz7C0U+U3vp0LzYyORuRqlxx1ptOIXPHU9sthkpZ7Qul9M10fbevC/zWYK/zh4xnafBhWXurJPdcqaIA==',
        'userId': '3035180589'
    },
    {   // 账号2 (如果不需要，可以删除或注释掉这一段)
        'passToken': 'xxxxx',
        'userId': 'xxxxx'
    }
    // 可继续添加更多账号...
];
// ##################################################


// 全局通知内容累加器
let notifyMessage = '';

// 封装的日志记录函数
function log(message) {
    console.log(message);
    notifyMessage += message + '\n';
}

// 辅助函数：休眠指定毫秒数
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class RnlRequest {
    constructor(cookieString) {
        this.cookie = cookieString;
        this.baseHeaders = {
            'Host': 'm.jr.airstarfinance.net',
            'User-Agent': 'Mozilla/5.0 (Linux; U; Android 14; zh-CN; M2012K11AC Build/UKQ1.230804.001; AppBundle/com.mipay.wallet; AppVersionName/6.89.1.5275.2323; AppVersionCode/20577595; MiuiVersion/stable-V816.0.13.0.UMNCNXM; DeviceId/alioth; NetworkType/WIFI; mix_version; WebViewVersion/118.0.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Mobile Safari/537.36 XiaoMi/MiuiBrowser/4.3',
            'Cookie': this.cookie,
        };
    }

    async get(url) {
        try {
            const response = await $task.fetch({
                url: url,
                method: 'GET',
                headers: this.baseHeaders
            });
            if (response.statusCode !== 200) throw new Error(`HTTP Status ${response.statusCode}`);
            return JSON.parse(response.body);
        } catch (error) {
            log(`[GET请求错误] ${error.message}`);
            return null;
        }
    }

    async post(url, data) {
        try {
            const response = await $task.fetch({
                url: url,
                method: 'POST',
                headers: {
                    ...this.baseHeaders,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams(data).toString(),
            });
            if (response.statusCode !== 200) throw new Error(`HTTP Status ${response.statusCode}`);
            return JSON.parse(response.body);
        } catch (error) {
            log(`[POST请求错误] ${error.message}`);
            return null;
        }
    }
}

class RNL {
    constructor(cookie) {
        this.t_id = null;
        this.activity_code = '2211-videoWelfare';
        this.rr = new RnlRequest(cookie);
    }
    
    // ... (此处省略了和 Node.js 版本几乎完全相同的 RNL 类的所有方法)
    // 为了简洁，这里不再重复粘贴，它们的逻辑和前面的版本是一样的
    // 实际使用时，请确保这些方法都存在
    async get_task_list() {
        const data = { 'activityCode': this.activity_code };
        const response = await this.rr.post('https://m.jr.airstarfinance.net/mp/api/generalActivity/getTaskList', data);
        if (response && response.code === 0) {
            log("获取任务列表成功。");
            return response.value.taskInfoList.filter(task => task.taskName.includes('浏览组浏览任务'));
        }
        log(`获取任务列表失败: ${JSON.stringify(response)}`);
        return null;
    }

    async get_task(task_code) {
        const data = { 'activityCode': this.activity_code, 'taskCode': task_code, 'jrairstar_ph': '98lj8puDf9Tu/WwcyMpVyQ==' };
        const response = await this.rr.post('https://m.jr.airstarfinance.net/mp/api/generalActivity/getTask', data);
        if (response && response.code === 0) {
            log("获取任务信息成功。");
            return response.value.taskInfo.userTaskId;
        }
        log(`获取任务信息失败：${JSON.stringify(response)}`);
        return null;
    }

    async complete_task(task_id, t_id, brows_click_urlId) {
        const url = `https://m.jr.airstarfinance.net/mp/api/generalActivity/completeTask?activityCode=${this.activity_code}&app=com.mipay.wallet&isNfcPhone=true&channel=mipay_indexicon_TVcard&deviceType=2&system=1&visitEnvironment=2&userExtra=%7B%22platformType%22:1,%22com.miui.player%22:%224.27.0.4%22,%22com.miui.video%22:%22v2024090290(MiVideo-UN)%22,%22com.mipay.wallet%22:%226.83.0.5175.2256%22%7D&taskId=${task_id}&browsTaskId=${t_id}&browsClickUrlId=${brows_click_urlId}&clickEntryType=undefined&festivalStatus=0`;
        const response = await this.rr.get(url);
        if (response && response.code === 0) {
            log("完成任务成功。");
            return response.value;
        }
        log(`完成任务失败：${JSON.stringify(response)}`);
        return null;
    }

    async receive_award(user_task_id) {
        const url = `https://m.jr.airstarfinance.net/mp/api/generalActivity/luckDraw?imei=&device=manet&appLimit=%7B%22com.qiyi.video%22:false,%22com.youku.phone%22:true,%22com.tencent.qqlive%22:true,%22com.hunantv.imgo.activity%22:true,%22com.cmcc.cmvideo%22:false,%22com.sankuai.meituan%22:true,%22com.anjuke.android.app%22:false,%22com.tal.abctimelibrary%22:false,%22com.lianjia.beike%22:false,%22com.kmxs.reader%22:true,%22com.jd.jrapp%22:false,%22com.smile.gifmaker%22:true,%22com.kuaishou.nebula%22:false%7D&activityCode=${this.activity_code}&userTaskId=${user_task_id}&app=com.mipay.wallet&isNfcPhone=true&channel=mipay_indexicon_TVcard&deviceType=2&system=1&visitEnvironment=2&userExtra=%7B%22platformType%22:1,%22com.miui.player%22:%224.27.0.4%22,%22com.miui.video%22:%22v2024090290(MiVideo-UN)%22,%22com.mipay.wallet%22:%226.83.0.5175.2256%22%7D`;
        const response = await this.rr.get(url);
        if (response && response.code === 0) {
            log("领取奖励成功。");
            return true;
        }
        log(`领取奖励失败：${JSON.stringify(response)}`);
        return false;
    }

    async queryUserJoinListAndQueryUserGoldRichSum() {
        const totalRes = await this.rr.get('https://m.jr.airstarfinance.net/mp/api/generalActivity/queryUserGoldRichSum?app=com.mipay.wallet&deviceType=2&system=1&visitEnvironment=2&userExtra={"platformType":1,"com.miui.player":"4.27.0.4","com.miui.video":"v2024090290(MiVideo-UN)","com.mipay.wallet":"6.83.0.5175.2256"}&activityCode=2211-videoWelfare');
        if (!totalRes || totalRes.code !== 0) {
            log(`获取兑换视频天数失败：${JSON.stringify(totalRes)}`);
            return false;
        }
        const total = totalRes ? `${(parseInt(totalRes.value) / 100).toFixed(2)}天` : "未知";

        const listUrl = `https://m.jr.airstarfinance.net/mp/api/generalActivity/queryUserJoinList?&userExtra=%7B%22platformType%22:1,%22com.miui.player%22:%224.27.0.4%22,%22com.miui.video%22:%22v2024090290(MiVideo-UN)%22,%22com.mipay.wallet%22:%226.83.0.5175.2256%22%7D&activityCode=${this.activity_code}&pageNum=1&pageSize=20`;
        const response = await this.rr.get(listUrl);
        if (!response || response.code !== 0) {
            log(`查询任务完成记录失败：${JSON.stringify(response)}`);
            return false;
        }

        const historyList = response.value.data;
        const currentDate = new Date().toISOString().slice(0, 10);
        log(`当前用户兑换视频天数：${total}`);
        log(`------------ ${currentDate} 当天任务记录 ------------`);
        let foundTodayRecord = false;
        for (const item of historyList) {
            if (item.createTime.slice(0, 10) === currentDate) {
                const days = parseInt(item.value) / 100;
                log(`${item.createTime} 领到视频会员，+${days.toFixed(2)}天`);
                foundTodayRecord = true;
            }
        }
        if (!foundTodayRecord) log("今天暂无新的任务完成记录。");
        return true;
    }

    async main() {
        log("开始执行任务...");
        if (!(await this.queryUserJoinListAndQueryUserGoldRichSum())) return false;

        for (let i = 0; i < 3; i++) {
            log(`--- 正在执行第 ${i + 1} 个任务循环 ---`);
            const tasks = await this.get_task_list();
            if (!tasks || tasks.length === 0) return false;
            const task = tasks[0];

            let t_id;
            try {
                t_id = task.generalActivityUrlInfo.id;
                this.t_id = t_id;
            } catch {
                t_id = this.t_id;
            }

            log("等待13秒以完成任务浏览...");
            await sleep(13000);

            let user_task_id = await this.complete_task(task.taskId, t_id, task.generalActivityUrlInfo.browsClickUrlId);

            if (!user_task_id) {
                log("尝试重新获取任务数据以领取奖励...");
                user_task_id = await this.get_task(task.taskCode);
                if (!user_task_id) return false;
            }

            log("等待2秒...");
            await sleep(2000);

            if (!(await this.receive_award(user_task_id))) return false;

            log("等待2秒...");
            await sleep(2000);
        }

        await this.queryUserJoinListAndQueryUserGoldRichSum();
        log("所有任务执行完毕。");
        return true;
    }
}


async function get_xiaomi_cookies(passToken, userId) {
    const loginUrl = 'https://account.xiaomi.com/pass/serviceLogin?callback=https%3A%2F%2Fapi.jr.airstarfinance.net%2Fsts%3Fsign%3D1dbHuyAmee0NAZ2xsRw5vhdVQQ8%253D%26followup%3Dhttps%253A%252F%252Fm.jr.airstarfinance.net%252Fmp%252Fapi%252Flogin%253Ffrom%253Dmipay_indexicon_TVcard%2526deepLinkEnable%253Dfalse%2526requestUrl%253Dhttps%25253A%25252F%25252Fm.jr.airstarfinance.net%25252Fmp%25252Factivity%25252FvideoActivity%25253Ffrom%25253Dmipay_indexicon_TVcard%252526_noDarkMode%25253Dtrue%252526_transparentNaviBar%25253Dtrue%252526cUserId%25253Dusyxgr5xjumiQLUoAKTOgvi858Q%252526_statusBarHeight%25253D137&sid=jrairstar&_group=DEFAULT&_snsNone=true&_loginType=ticket';
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 Edg/135.0.0.0',
        'Cookie': `passToken=${passToken}; userId=${userId};`
    };

    try {
        const response = await $task.fetch({ url: loginUrl, headers });
        // $task.fetch 会跟随重定向，我们直接从最终响应的头里找cookie
        const setCookieHeader = response.headers['Set-Cookie'];
        if (!setCookieHeader) throw new Error("响应头中未找到 Set-Cookie");

        // 解析 Set-Cookie
        const cUserIdMatch = setCookieHeader.match(/cUserId=([^;]+)/);
        const serviceTokenMatch = setCookieHeader.match(/jrairstar_serviceToken=([^;]+)/);

        if (cUserIdMatch && serviceTokenMatch) {
            return `cUserId=${cUserIdMatch[1]};jrairstar_serviceToken=${serviceTokenMatch[1]}`;
        }
        throw new Error("未能从 Set-Cookie 中解析出必要字段");

    } catch (e) {
        log(`获取Cookie失败: ${e.message}`);
        return null;
    }
}


// ==================== 主程序入口 ====================
(async () => {
    const runCountKey = 'xiaomiTaskRunCount';
    let runCount = $persistentStore.read(runCountKey);
    runCount = runCount ? parseInt(runCount) + 1 : 1;
    $persistentStore.write(String(runCount), runCountKey);
    
    log(`脚本已执行 ${runCount} 次`);
    log(">>>>>>>>>> 脚本开始执行 <<<<<<<<<<");

    const cookie_list = [];
    for (const account of ORIGINAL_COOKIES) {
        if (!account.passToken || account.passToken === 'xxxxx') {
            log(`⚠️ 账号 ${account.userId || ''} 配置为空，跳过。`);
            continue;
        }

        log(`\n>>>>>>>>>> 正在处理账号 ${account.userId} <<<<<<<<<<`);
        const newCookie = await get_xiaomi_cookies(account.passToken, account.userId);
        if (newCookie) {
            cookie_list.push({ cookie: newCookie, userId: account.userId });
            log(`✅ 账号 ${account.userId} Cookie获取成功`);
        } else {
            log(`❌ 账号 ${account.userId} Cookie获取失败，请检查配置`);
        }
    }

    log(`\n>>>>>>>>>> 共获取到 ${cookie_list.length} 个有效Cookie <<<<<<<<<<`);

    for (let i = 0; i < cookie_list.length; i++) {
        const account = cookie_list[i];
        log(`\n--------- 开始执行账号 ${account.userId} (第${i + 1}个) ---------`);
        try {
            const success = await new RNL(account.cookie).main();
            if (success) {
                log(`✅ 账号 ${account.userId} 任务执行成功！`);
            } else {
                log(`❌ 账号 ${account.userId} 任务执行失败。`);
            }
        } catch (e) {
            log(`⚠️ 账号 ${account.userId} 执行异常: ${e.message}`);
        }
        log(`--------- 账号 ${account.userId} 执行结束 ---------`);
    }

    log("\n>>>>>>>>>> 脚本执行完毕 <<<<<<<<<<");
    
    // 发送最终的通知
    $notification.post('小米视频会员任务', '任务执行完成', notifyMessage);
    $done();
})();
