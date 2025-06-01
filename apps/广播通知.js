import yaml from 'yaml'
import { promises as fs } from 'fs'
import common from '../../../lib/common/common.js'

//代码来源：@千奈千祁【https://gitee.com/qiannqq】
//对代码进行修改并容易插件
//融入此插件自用，如使用遇到问题请删除“广播通知.js”下载原本广播通知.js插件！！


//广播消息是否开启延迟 (默认为5秒)
let delays = true
//发送消息延迟 (开启延迟后生效)
let Nnumber = 5000
//广播消息是否开启随机延迟 (需开启延迟后再开启随机延迟，默认在4到6秒内随机发送消息)
let random_delays = true
// isMakeMsgList 广播完成后将所有结果合并转发而不是实时返回 isOnlyResult 只发送简易广播结果 例如【成功：7 失败：3】
let cfg = {
    isMakeMsgList: false,
    isOnlyResult: false
}

export class example2 extends plugin {
  constructor() {
    super({
      name: '广播通知',
      dsc: '[@千奈千祁]广播通知',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^#(白名单|黑名单)?广播通知$',
          fnc: 'broadcast'
        }
      ]
    })
  }

  async broadcast(e) {
    if (!e.isMaster) return true;
    await e.reply(`请发送你要广播的内容`)
    this.setContext('broadcast_')
  }

  async broadcast_(e) {
    this.finish('broadcast_')
    let msg = e.msg.match(/^#(白名单|黑名单)?广播通知$/)
    console.log(e.msg)
    let otheryaml = await fs.readFile(`../../config/config/other.yaml`, `utf-8`)
    let other = yaml.parse(otheryaml)
    let result
    if(!msg[1]){
        let all_group = Array.from(Bot[e.self_id].gl.values())
        let all_groupid = []
        for (let item of all_group){
            all_groupid.push(item.group_id)
        }
        result = await 发送消息(all_groupid, this.e.message, e)
        e.reply(`广播已完成`)
    } else if(msg[1] == `白名单`){
        if(other.whiteGroup.length == 0){
            e.reply(`白名单为空，广播失败`)
            return true;
        }
        result = await 发送消息(other.whiteGroup, this.e.message, e)
        e.reply(`广播已完成`)
    } else if(msg[1] == `黑名单`){
        if(other.blackGroup.length == 0){
            e.reply(`黑名单为空，广播失败`)
            return true;
        }
        result = await 发送消息(other.blackGroup, this.e.message, e)
        await e.reply('广播已完成')
    }
    if(cfg.isMakeMsgList) {
        let replyMsg
        try {
            replyMsg = await e.bot.pickFriend(e.bot.uin).makeForwardMsg(result.MakeMsgList)
        } catch (error) {
            replyMsg = result.MakeMsgList.map(item => item.message )
            replyMsg = replyMsg.join('\n')
        }
        await e.reply(replyMsg)
    }
    if(cfg.isOnlyResult) {
        await e.reply(`成功：${result.runResult.success} 失败：${result.runResult.fail}`)
    }
    return true
  }
}

async function 发送消息(group, message, e){
    await e.reply('已开始广播')
    let MakeMsgList = []
    let runResult = {
        success: 0,
        fail: 0
    }
    let groupNumber = group.length
    for (let item of group) {
        groupNumber--;
        let result
        let number = 0
        if(delays){
            number = Nnumber
        }
        if(delays && random_delays){
            number = Math.floor(Math.random() * (6000 - 4000 + 1)) + 4000;
        }
        await Bot[e.self_id].pickGroup(item).sendMsg(message)
            .then(() => { result = false;if(!cfg.isMakeMsgList && !cfg.isOnlyResult)e.reply(`群${item}消息已送达，等待${number}毫秒后广播下一个群\n剩余${groupNumber}个群`) })
            .catch((err) => { result = err;if(!cfg.isMakeMsgList && !cfg.isOnlyResult)e.reply(`群${item}消息发送失败，等待${number}毫秒后广播下一个群\n剩余${groupNumber}个群\n错误码:${err.code}\n错误信息:${err.message}`)})
        
        let msg
        if(result) {
            msg = `群${item}消息发送失败\n错误码:${result.code}\n错误信息:${result.message}`
            runResult.fail++
        } else {
            msg = `群${item}消息已送达`
            runResult.success++
        }
        MakeMsgList.push({
            nickname: e.bot.nickname,
            user_id: e.bot.uin,
            message: msg
        })
        await common.sleep(number)
    }
    return { MakeMsgList, runResult }
}
