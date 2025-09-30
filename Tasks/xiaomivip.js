/*
 * Quantumult X 小米钱包视频会员任务脚本 (v2 - QX专用版)
 *
 * 基于用户的原生 Node.js 脚本逻辑进行修改，以适配 Quantumult X 环境。
 * 保留了原有的类结构、随机等待、双重循环等核心逻辑。
 *
 * @author Gemini & YourUsername
 *
 * [task_local]
 * # 手动执行 (长按右下角风车图标运行):
 * event-interaction https://raw.githubusercontent.com/XXXOUXINGYU/QX/main/Tasks/xiaomivip.js, tag=小米会员任务-手动, img-url=mi.system, enabled=true
 *
 * # 定时执行 (每天早上8点35分):
 * 35 8 * * * https://raw.githubusercontent.com/XXXOUXINGYU/QX/main/Tasks/xiaomivip.js, tag=小米会员任务-定时, img-url=mi.system, enabled=true
 */

// #################### 用户配置区 ####################
const ORIGINAL_COOKIES = [
    {   // 账号1
        passToken: 'V1:J7rrshrufaw8uWrlTMO7x1oEssq3KSjm0vRDBu2tDhm3uV/L5TrGDIdJx85mIDEZcm4qLqu6tplq3Nzwwye/rAwz1Dc3CBfv2Xp8Yvpz+SGcs386uPCShdBgXpMwaNMCIz1dPYqk9Ic3IGteU3uhQHBZ6un+fp1fBEeSA9YnrOsEOBStRgpS0vcKcrQrbWhuKAiv8O31ZnXsTJRci1XCAoycH1thpMbovZf4q3WV6fvW/Wc4ky7u8nJjY+zRe3xGlQKuMXfz7C0U+U3vp0LzYyORuRqlxx1ptOIXPHU9sthkpZ7Qul9M10fbevC/zWYK/zh4xnafBhWXurJPdcqaIA==',
        userId: '3035180589'
    },
    {   // 账号2 (如果不需要，可以删除)
        passToken: 'xxxxx',
        userId: 'xxxxx'
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

// RnlRequest 类 (使用 $task.fetch 重写)
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
            const response = await $task.fetch({ url, method: 'GET', headers: this.baseHeaders });
            if (response.statusCode !== 200) throw new Error(`HTTP Status ${response.statusCode}`);
            return JSON.parse(response.body);
        } catch (e) {
            log(`[GET请求错误] ${url} - ${e.message}`);
            return null;
        }
    }

    async post(url, data) {
        try {
            const response = await $task.fetch({
                url,
                method: 'POST',
                headers: { ...this.baseHeaders, 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams(data).toString(),
            });
            if (response.statusCode !== 200) throw new Error(`HTTP Status ${response.statusCode}`);
            return JSON.parse(response.body);
        } catch (e) {
            log(`[POST请求错误] ${url} - ${e.message}`);
            return null;
        }
    }
}

// RNL 类 (业务逻辑，与你的版本完全一致)
class RNL {
    constructor(cookie) {
        this.tId = null;
        this.activityCode = '2211-videoWelfare';
        this.rr = new RnlRequest(cookie);
    }

    async randomWait(minSeconds, maxSeconds) {
        const waitTime = Math.floor(Math.random() * (maxSeconds - minSeconds + 1)) + minSeconds;
        log(`随机等待 ${waitTime} 秒...`);
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
    }

    async getTaskList() {
        const data = { activityCode: this.activityCode };
        const response = await this.rr.post('https://m.jr.airstarfinance.net/mp/api/generalActivity/getTaskList', data);
        if (response && response.code === 0) {
            log("获取任务列表成功。");
            return response.value.taskInfoList.filter(task => task.taskName.includes('浏览组浏览任务'));
        }
        log(`获取任务列表失败: ${JSON.stringify(response)}`);
        return null;
    }

    async getTask(taskCode) {
        const data = { activityCode: this.activityCode, taskCode, 'jrairstar_ph': '98lj8puDf9Tu/WwcyMpVyQ==' };
        const response = await this.rr.post('https://m.jr.airstarfinance.net/mp/api/generalActivity/getTask', data);
        if (response && response.code === 0) {
            log("获取任务信息成功。");
            return response.value.taskInfo.userTaskId;
        }
        log(`获取任务信息失败：${JSON.stringify(response)}`);
        return null;
    }

    async completeTask(taskId, tId, browsClickUrlId) {
        const url = `https://m.jr.airstarfinance.net/mp/api/generalActivity/completeTask?activityCode=${this.activityCode}&app=com.mipay.wallet&isNfcPhone=true&channel=mipay_indexicon_TVcard&deviceType=2&system=1&visitEnvironment=2&userExtra=%7B%22platformType%22:1,%22com.miui.player%22:%224.27.0.4%22,%22com.miui.video%22:%22v2024090290(MiVideo-UN)%22,%22com.mipay.wallet%22:%226.83.0.5175.2256%22%7D&taskId=${taskId}&browsTaskId=${tId}&browsClickUrlId=${browsClickUrlId}&clickEntryType=undefined&festivalStatus=0`;
        const response = await this.rr.get(url);
        if (response && response.code === 0) {
            log("完成任务成功。");
            return response.value;
        }
        log(`完成任务失败：${JSON.stringify(response)}`);
        return null;
    }

    async receiveAward(userTaskId) {
        const url = `https://m.jr.airstarfinance.net/mp/api/generalActivity/luckDraw?imei=&device=manet&appLimit=%7B%22com.qiyi.video%22:false,%22com.youku.phone%22:true,%22com.tencent.qqlive%22:true,%22com.hunantv.imgo.activity%22:true,%22com.cmcc.cmvideo%22:false,%22com.sankuai.meituan%22:true,%22com.anjuke.android.app%22:false,%22com.tal.abctimelibrary%22:false,%22com.lianjia.beike%22:false,%22com.kmxs.reader%22:true,%22com.jd.jrapp%22:false,%22com.smile.gifmaker%22:true,%22com.kuaishou.nebula%22:false%7D&activityCode=${this.activityCode}&userTaskId=${userTaskId}&app=com.mipay.wallet&isNfcPhone=true&channel=mipay_indexicon_TVcard&deviceType=2&system=1&visitEnvironment=2&userExtra=%7B%22platformType%22:1,%22com.miui.player%22:%224.27.0.4%22,%22com.miui.video%22:%22v2024090290(MiVideo-UN)%22,%22com.mipay.wallet%22:%226.83.0.5175.2256%22%7D`;
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

        const listUrl = `https://m.jr.airstarfinance.net/mp/api/generalActivity/queryUserJoinList?&userExtra=%7B%22platformType%22:1,%22com.miui.player%22:%224.27.0.4%22,%22com.miui.video%22:%22v2024090290(MiVideo-UN)%22,%22com.mipay.wallet%22:%226.83.0.5175.2256%22%7D&activityCode=${this.activityCode}&pageNum=1&pageSize=20`;
        const response = await this.rr.get(listUrl);
        if (!response || response.code !== 0) {
            log(`查询任务完成记录失败：${JSON.stringify(response)}`);
            return false;
        }

        const historyList = response.value.data;
        const currentDate = new Date().toISOString().split('T')[0];
        log(`当前用户兑换视频天数：${total}`);
        log(`------------ ${currentDate} 当天任务记录 ------------`);
        let foundTodayRecord = false;
        for (const a of historyList) {
            const recordDate = a.createTime.substring(0, 10);
            if (recordDate === currentDate) {
                const days = parseInt(a.value) / 100;
                log(`${a.createTime} 领到视频会员，+${days.toFixed(2)}天`);
                foundTodayRecord = true;
            }
        }
        if (!foundTodayRecord) log("今天暂无新的任务完成记录。");
        return true;
    }

    async main() {
        log("开始执行任务...");
        if (!await this.queryUserJoinListAndQueryUserGoldRichSum()) return false;
        
        // 修改为2次循环
        for (let i = 0; i < 2; i++) {
            log(`--- 正在执行第 ${i + 1} 个任务循环 ---`);
            const tasks = await this.getTaskList();
            if (!tasks || tasks.length === 0) {
                log('未能获取到可执行的任务，退出当前账号循环。');
                return false; // 如果获取不到任务，直接返回失败
            }
            const task = tasks[0];

            let tId;
            try {
                tId = task.generalActivityUrlInfo.id;
                this.tId = tId;
            } catch {
                tId = this.tId;
            }

            // 增加健壮性检查
            if (!task.taskId || !tId || !task.generalActivityUrlInfo.browsClickUrlId) {
                log('任务信息不完整，无法继续执行。');
                return false;
            }

            await this.randomWait(13, 16);

            let userTaskId = await this.completeTask(task.taskId, tId, task.generalActivityUrlInfo.browsClickUrlId);

            if (!userTaskId) {
                log("尝试重新获取任务数据以领取奖励...");
                userTaskId = await this.getTask(task.taskCode);
                if (!userTaskId) return false;
            }
            await this.randomWait(2, 4);
            if (!await this.receiveAward(userTaskId)) return false;
            await this.randomWait(2, 4);
        }

        await this.queryUserJoinListAndQueryUserGoldRichSum();
        log("所有任务执行完毕。");
        return true;
    }
}

// 获取小米Cookie (使用 $task.fetch 重写)
async function getXiaomiCookies(passToken, userId) {
    const loginUrl = 'https://account.xiaomi.com/pass/serviceLogin?callback=https%3A%2F%2Fapi.jr.airstarfinance.net%2Fsts%3Fsign%3D1dbHuyAmee0NAZ2xsRw5vhdVQQ8%253D%26followup%3Dhttps%253A%252F%252Fm.jr.airstarfinance.net%252Fmp%252Fapi%252Flogin%253Ffrom%253Dmipay_indexicon_TVcard%2526deepLinkEnable%253Dfalse%2526requestUrl%253Dhttps%25253A%25252F%25252Fm.jr.airstarfinance.net%25252Fmp%25252Factivity%25252FvideoActivity%25253Ffrom%25253Dmipay_indexicon_TVcard%252526_noDarkMode%25253Dtrue%252526_transparentNaviBar%25253Dtrue%252526cUserId%25253Dusyxgr5xjumiQLUoAKTOgvi858Q%252526_statusBarHeight%25253D137&sid=jrairstar&_group=DEFAULT&_snsNone=true&_loginType=ticket';
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 Edg/135.0.0.0',
        'Cookie': `passToken=${passToken}; userId=${userId};`
    };

    try {
        const response = await $task.fetch({ url: loginUrl, headers });
        const setCookieHeader = response.headers['Set-Cookie'] || response.headers['set-cookie'];
        if (!setCookieHeader) throw new Error("响应头中未找到 Set-Cookie");

        const cUserIdMatch = setCookieHeader.match(/cUserId=([^;]+)/);
        const serviceTokenMatch = setCookieHeader.match(/jrairstar_serviceToken=([^;]+)/);

        if (cUserIdMatch && serviceTokenMatch) {
            return `cUserId=${cUserIdMatch[1]};jrairstar_serviceToken=${serviceTokenMatch[1]}`;
        }
        throw new Error("未能从 Set-Cookie 中解析出 cUserId 或 serviceToken");
    } catch (e) {
        log(`获取Cookie失败: ${e.message}`);
        return null;
    }
}

// ==================== 主程序入口 ====================
(async () => {
    // 使用 $persistentStore 替换 fs
    const runCountKey = 'xiaomiTaskRunCount_v2';
    let runCount = $persistentStore.read(runCountKey);
    runCount = runCount ? parseInt(runCount) + 1 : 1;
    $persistentStore.write(String(runCount), runCountKey);

    log(`脚本v2已执行 ${runCount} 次`);
    log(">>>>>>>>>> 脚本v2开始执行 <<<<<<<<<<");

    const cookieList = [];
    for (const account of ORIGINAL_COOKIES) {
        if (!account.passToken || account.passToken === 'xxxxx' || !account.userId) {
            log(`⚠️ 账号配置不完整或为空，跳过。`);
            continue;
        }

        log(`\n>>>>>>>>>> 正在处理账号 ${account.userId} <<<<<<<<<<`);
        const newCookie = await getXiaomiCookies(account.passToken, account.userId);
        if (newCookie) {
            cookieList.push({ cookie: newCookie, userId: account.userId });
            log(`✅ 账号 ${account.userId} Cookie获取成功`);
        } else {
            log(`❌ 账号 ${account.userId} Cookie获取失败，请检查配置或Token是否过期`);
        }
    }

    log(`\n>>>>>>>>>> 共获取到 ${cookieList.length} 个有效Cookie <<<<<<<<<<`);

    for (let index = 0; index < cookieList.length; index++) {
        const account = cookieList[index];
        log(`\n--------- 开始执行账号 ${account.userId} (第${index + 1}个) ---------`);
        try {
            const rnl = new RNL(account.cookie);
            const success = await rnl.main();
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

    log("\n>>>>>>>>>> 脚本v2执行完毕 <<<<<<<<<<");

    // 发送最终的通知
    $notification.post('小米会员任务 v2', '任务执行完成', notifyMessage);
    $done();
})().catch(e => {
    log(`脚本发生致命错误: ${e.message}`);
    $notification.post('小米会员任务 v2', '脚本执行失败', `发生致命错误: ${e.message}`);
    $done();
});
