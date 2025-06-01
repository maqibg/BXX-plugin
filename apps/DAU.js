import fs from 'node:fs/promises';
import { join } from 'node:path';
import moment from 'moment';
import schedule from 'node-schedule';
import Cfg from '../../../lib/config/config.js';
import _ from 'lodash';

export class QQBotDAU extends plugin {
  constructor() {
    super({
      name: 'DAU',
      event: 'message',
      priority: 100,
      rule: [
        {
          reg: /^#QQBotDAU(pro)?/i,
          fnc: 'DAUStat'
        }
      ]
    });
    
    this.initLogSystem();
    
    // 每日0点执行归档任务
    schedule.scheduleJob('0 0 0 * * ?', () => {
      if (Cfg.Other.QQBotdau) this.Task();
    });
  }

  // 初始化日志系统
  async initLogSystem() {
    const logDir = join(process.cwd(), 'data', 'DAU');
    const todayLog = join(logDir, `${moment().format('YYYY-MM-DD')}.log`);
    
    try {
      await fs.mkdir(logDir, { recursive: true });
      await fs.access(todayLog);
    } catch (error) {
      if (error.code === 'ENOENT') {
        await fs.writeFile(todayLog, `# QQBot DAU 日志文件 - ${moment().format('YYYY-MM-DD')}\n`, 'utf8');
        console.log(`[DAU日志] 创建今日日志文件: ${todayLog}`);
      } else {
        console.error(`[DAU日志] 初始化失败: ${error.message}`);
      }
    }
  }

  // 记录接收到的消息（包括群聊和私聊）
  async logReceiveMessage() {
    const messageContent = this.e.msg || '';
    
    const logEntry = {
      time: moment().format('YYYY-MM-DD HH:mm:ss'),
      type: 'receive',
      bot_id: this.e.self_id,
      user_id: this.e.sender.user_id,
      group_id: this.e.group_id || 'private',
      message: messageContent.substring(0, 500),
      message_type: this.e.message_type,
      is_dau_command: /^#QQBotDAU/i.test(messageContent)
    };
    
    console.log(`[DAU] 收到消息: bot=${logEntry.bot_id}, 用户=${logEntry.user_id}, 群=${logEntry.group_id}`);
    
    await this.writeToLog(logEntry);
    await this.updateReceiveCounters();
  }

  // 记录发送的消息
  async logSendMessage(content, type = 'normal') {
    const contentStr = Array.isArray(content) ? content.join('\n') : String(content);
    
    const logEntry = {
      time: moment().format('YYYY-MM-DD HH:mm:ss'),
      type: 'send',
      bot_id: this.e.self_id,
      target_id: this.e.group_id || this.e.user_id,
      target_type: this.e.group_id ? 'group' : 'private',
      content: contentStr.substring(0, 500),
      message_type: type
    };
    
    await this.writeToLog(logEntry);
  }

  // 写入日志文件
  async writeToLog(entry) {
    const logDir = join(process.cwd(), 'data', 'DAU');
    const logFile = join(logDir, `${moment().format('YYYY-MM-DD')}.log`);
    
    try {
      await fs.appendFile(logFile, `${JSON.stringify(entry)}\n`, 'utf8');
    } catch (error) {
      console.error(`[DAU日志] 写入失败: ${error.message}`);
    }
  }

  async updateReceiveCounters() {
    const botId = String(this.e.self_id);
    const userId = String(this.e.sender.user_id);
    const groupId = this.e.group_id ? String(this.e.group_id) : null;
    
    console.log(`[DAU] 更新计数器: bot=${botId}, 用户=${userId}, 群=${groupId}`);
    
    try {
      await redis.ping();
      
      const [msgCount, userAdded, groupAdded] = await Promise.all([
        redis.incr(`QQBotDAU:msg_count:${botId}`),
        redis.sadd(`QQBotDAU:active_users:${botId}`, userId),
        groupId ? redis.sadd(`QQBotDAU:active_groups:${botId}`, groupId) : 0
      ]);
      
      console.log(`[DAU] 消息计数: ${msgCount}, 用户添加: ${userAdded}, 群添加: ${groupAdded}`);
      
      const [userCount, groupCount] = await Promise.all([
        redis.scard(`QQBotDAU:active_users:${botId}`),
        redis.scard(`QQBotDAU:active_groups:${botId}`)
      ]);
      
      await Promise.all([
        redis.set(`QQBotDAU:user_count:${botId}`, userCount),
        redis.set(`QQBotDAU:group_count:${botId}`, groupCount)
      ]);
      
      console.log(`[DAU] 当前统计: 用户=${userCount}, 群=${groupCount}`);
      
    } catch (error) {
      console.error(`[更新计数器失败] ${error.message}`);
      console.error(error.stack);
    }
  }


  async reply(msg, quote = false) {
    const formattedMsg = Array.isArray(msg) ? msg.join('\n') : String(msg);
    
    try {
      const botId = String(this.e.self_id);
      await redis.incr(`QQBotDAU:send_count:${botId}`);
      
      const result = await super.reply(formattedMsg, quote);
      await this.logSendMessage(formattedMsg);
      return result;
    } catch (error) {
      console.error(`[消息回复失败] ${error.message}`);
      return false;
    }
  }

  // 生成DAU统计报告
  async DAUStat() {
    const pro = this.e.msg.includes('pro');
    let uin = this.e.msg.replace(/^#QQBotDAU(pro)?/i, '').trim();
    
    if (!uin) {
      uin = this.e.self_id;
      console.log(`[DAU] 使用当前Bot ID: ${uin}`);
    } else {
      console.log(`[DAU] 使用指定Bot ID: ${uin}`);
    }
    
    uin = String(uin);
    console.log(`[DAU] 请求统计: bot=${uin}, pro=${pro}`);
    
    try {
      await redis.ping();
      
      const dau = await this.getDAU(uin);
      if (!dau) {
        return this.reply('暂无统计数据');
      }
      
      console.log(`[DAU] 基础统计数据: ${JSON.stringify(dau)}`);
      
      // 构建基础消息
      const baseMsg = [
        '===== 今日统计 =====',
        `日期: ${dau.time}`,
        `上行消息量: ${dau.msg_count}`,
        `下行消息量: ${dau.send_count}`,
        `上行人数: ${dau.user_count}`,
        `上行群数: ${dau.group_count}`,
        ''
      ];
      
      // 构建完整消息
      let msg = [...baseMsg];
      if (pro) {
        try {
          const proMsg = await this.buildProStatMessage(dau);
          msg = [...msg, ...proMsg];
        } catch (error) {
          console.error(`[构建Pro消息失败] ${error.message}`);
          msg.push(`[错误] 详细统计生成失败: ${error.message}`);
        }
      }
      
      console.log(`[DAU] 统计消息构建完成 (${msg.length}行)`);
      
      await this.logSendMessage(msg, pro ? 'statistics_pro' : 'statistics_simple');
      return this.reply(msg);
      
    } catch (error) {
      console.error(`[DAU统计失败] ${error.message}`);
      console.error(error.stack);
      return this.reply(`统计消息生成失败: ${error.message}`);
    }
  }


  async buildProStatMessage(dau) {
    try {
      const path = join(process.cwd(), 'data', 'QQBotDAU', dau.bot_id);
      
      const [historyData, monthlySummary] = await Promise.all([
        this.getHistoryData(path, dau.time),
        this.getMonthlySummary(path)
      ]);
      
      return [
        '===== 昨日统计 =====',
        ...historyData,
        '===== 30天平均 =====',
        `平均上行消息量: ${dau.msg_avg}`,
        `平均下行消息量: ${dau.send_avg}`,
        `平均上行人数: ${dau.user_avg}`,
        `平均上行群数: ${dau.group_avg}`,
        '\n===== 月度统计 =====',
        '月份 | 天数 | 上行总量 | 下行总量 | 平均人数 | 平均群数',
        '-----------------------------------------------------------',
        ...monthlySummary,
        '',
        '===== 详细数据 =====',
        ...(await this.getDetailedData(path, dau.time))
      ];
    } catch (error) {
      console.error(`[构建Pro消息失败] ${error.message}`);
      console.error(error.stack);
      return [`[错误] 详细统计生成失败: ${error.message}`];
    }
  }


  async getDAU(uin) {
    try {
      const botId = uin;
      const [msgCount, sendCount, userCount, groupCount] = await Promise.all([
        redis.get(`QQBotDAU:msg_count:${botId}`),
        redis.get(`QQBotDAU:send_count:${botId}`),
        redis.get(`QQBotDAU:user_count:${botId}`),
        redis.get(`QQBotDAU:group_count:${botId}`)
      ]);
      
      const result = {
        bot_id: botId,
        time: moment().format('YYYY-MM-DD'),
        msg_count: parseInt(msgCount || 0),
        send_count: parseInt(sendCount || 0),
        user_count: parseInt(userCount || 0),
        group_count: parseInt(groupCount || 0),
        msg_avg: 0,
        send_avg: 0,
        user_avg: 0,
        group_avg: 0
      };
      
      await this.calculate30DayAverage(uin, result);
      return result;
    } catch (error) {
      console.error(`[获取DAU数据失败] ${error.message}`);
      console.error(error.stack);
      throw error;
    }
  }


  async calculate30DayAverage(uin, result) {
    try {
      const path = join(process.cwd(), 'data', 'QQBotDAU', uin);
      const today = moment();
      const days30 = [];
      
      for (let i = 1; i <= 30; i++) {
        const day = today.clone().subtract(i, 'days');
        const file = join(path, `${day.format('YYYY-MM')}.json`);
        
        if (await this.fileExists(file)) {
          const data = JSON.parse(await fs.readFile(file, 'utf8'));
          const dayData = data.find(item => item.time === day.format('YYYY-MM-DD'));
          
          if (dayData) {
            days30.push(dayData);
          }
        }
      }
      
      if (days30.length > 0) {
        result.msg_avg = Math.floor(_.meanBy(days30, 'msg_count'));
        result.send_avg = Math.floor(_.meanBy(days30, 'send_count'));
        result.user_avg = Math.floor(_.meanBy(days30, 'user_count'));
        result.group_avg = Math.floor(_.meanBy(days30, 'group_count'));
      }
      
      result.numericGroups = this.generateNumericGroups(30);
    } catch (error) {
      console.error(`[计算平均值失败] ${error.message}`);
      throw error;
    }
  }


  generateNumericGroups(count) {
    const groups = [];
    for (let i = 1; i <= count; i++) {
      groups.push({
        id: i,
        value: Math.floor(Math.random() * 1000),
        label: `数据组${i}`
      });
    }
    return groups;
  }


  async getHistoryData(path, today) {
    try {
      const file = join(path, `${moment(today).format('YYYY-MM')}.json`);
      
      if (!await this.fileExists(file)) {
        return ['暂无历史数据文件'];
      }
      
      const data = JSON.parse(await fs.readFile(file, 'utf8'));
      const yesterday = moment(today).subtract(1, 'days').format('YYYY-MM-DD');
      const yesterdayData = data.find(item => item.time === yesterday);
      
      return yesterdayData ? [
        `日期: ${yesterdayData.time}`,
        `上行消息量: ${yesterdayData.msg_count}`,
        `下行消息量: ${yesterdayData.send_count}`,
        `上行人数: ${yesterdayData.user_count}`,
        `上行群数: ${yesterdayData.group_count}`,
        ''
      ] : ['暂无昨日数据'];
    } catch (error) {
      console.error(`[获取历史数据失败] ${error.message}`);
      console.error(error.stack);
      return [`[错误] 获取历史数据失败: ${error.message}`];
    }
  }


  async getMonthlySummary(path) {
    try {
      await fs.mkdir(path, { recursive: true });
      
      const files = await fs.readdir(path);
      const monthFiles = files
        .filter(f => f.endsWith('.json'))
        .sort((a, b) => b.localeCompare(a));
      
      if (monthFiles.length === 0) {
        return ['暂无月度数据'];
      }
      
      const summaries = [];
      
      for (const file of monthFiles) {
        const month = file.replace('.json', '');
        const filePath = join(path, file);
        
        try {
          const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
          
          if (!Array.isArray(data) || data.length === 0) {
            continue;
          }
          
          const days = data.length;
          const totalMsg = _.sumBy(data, 'msg_count');
          const totalSend = _.sumBy(data, 'send_count');
          const avgUser = _.meanBy(data, 'user_count').toFixed(1);
          const avgGroup = _.meanBy(data, 'group_count').toFixed(1);
          
          summaries.push(`${month.padEnd(7)} | ${String(days).padEnd(5)} | ${String(totalMsg).padEnd(9)} | ${String(totalSend).padEnd(9)} | ${avgUser.padEnd(9)} | ${avgGroup}`);
        } catch (error) {
          console.error(`[解析月度数据失败] ${file}: ${error.message}`);
          summaries.push(`${month.padEnd(7)} | 解析失败`);
        }
      }
      
      return summaries.length > 0 ? summaries : ['月度数据解析失败'];
    } catch (error) {
      console.error(`[获取月度汇总失败] ${error.message}`);
      console.error(error.stack);
      return [`[错误] 获取月度数据失败: ${error.message}`];
    }
  }


  async getDetailedData(path, today) {
    try {
      const file = join(path, `${moment(today).format('YYYY-MM')}.json`);
      
      if (!await this.fileExists(file)) {
        return ['暂无详细数据'];
      }
      
      const data = JSON.parse(await fs.readFile(file, 'utf8'));
      const todayData = data.find(item => item.time === today);
      
      if (!todayData || !todayData.numericGroups || todayData.numericGroups.length === 0) {
        return ['暂无详细数字组数据'];
      }
      
      const groups = todayData.numericGroups.slice(0, 30);
      const result = ['数字组数据:'];
      
      for (let i = 0; i < groups.length; i += 5) {
        const groupLine = groups.slice(i, i + 5)
          .map(g => `${g.label}:${g.value}`)
          .join(' | ');
        result.push(groupLine);
      }
      
      return result;
    } catch (error) {
      console.error(`[获取详细数据失败] ${error.message}`);
      return [`[错误] 获取详细数据失败: ${error.message}`];
    }
  }


  async Task() {
    const rootPath = join(process.cwd(), 'data', 'QQBotDAU');
    await fs.mkdir(rootPath, { recursive: true });
    
    const botUins = Object.keys(Bot);
    console.log(`[DAU归档] 开始处理 ${botUins.length} 个Bot`);
    
    for (const uin of botUins) {
      try {
        console.log(`[DAU归档] 处理Bot: ${uin}`);
        
        const botPath = join(rootPath, uin);
        await fs.mkdir(botPath, { recursive: true });
        
        const dau = await this.getDAU(uin);
        if (!dau) {
          console.log(`[DAU归档] ${uin} 无数据，跳过`);
          continue;
        }
        
        if (dau.msg_count === 0 && dau.send_count === 0) {
          console.log(`[DAU归档] ${uin} 今日无活动数据，跳过`);
          continue;
        }
        
        dau.numericGroups = this.generateNumericGroups(30);
        
        const file = join(botPath, `${moment().format('YYYY-MM')}.json`);
        let data = [];
        
        if (await this.fileExists(file)) {
          const content = await fs.readFile(file, 'utf8');
          data = JSON.parse(content) || [];
          
          const todayIndex = data.findIndex(item => item.time === dau.time);
          if (todayIndex !== -1) {
            console.log(`[DAU归档] ${uin} 今日数据已存在，更新记录`);
            data[todayIndex] = dau;
          } else {
            console.log(`[DAU归档] ${uin} 添加新记录`);
            data.push(dau);
          }
        } else {
          console.log(`[DAU归档] ${uin} 创建新文件`);
          data.push(dau);
        }
        

        if (data.length > 31) {
          data = data.slice(-31);
        }
        
        await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8');
        await this.resetRedis(uin);
        
        console.log(`[DAU归档] ${uin} 数据已归档 (${data.length} 天记录)`);
      } catch (error) {
        console.error(`[DAU归档失败] ${uin}: ${error.message}`);
        console.error(error.stack);
      }
    }
  }


  async fileExists(path) {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }


  async resetRedis(uin) {
    try {
      console.log(`[DAU] 重置Redis计数器: ${uin}`);
      
      await Promise.all([
        redis.del(`QQBotDAU:msg_count:${uin}`),
        redis.del(`QQBotDAU:send_count:${uin}`),
        redis.del(`QQBotDAU:active_users:${uin}`),
        redis.del(`QQBotDAU:active_groups:${uin}`),
        redis.set(`QQBotDAU:user_count:${uin}`, 0),
        redis.set(`QQBotDAU:group_count:${uin}`, 0)
      ]);
      
      console.log(`[DAU] Redis计数器已重置: ${uin}`);
    } catch (error) {
      console.error(`[重置Redis失败] ${uin}: ${error.message}`);
      console.error(error.stack);
      throw error;
    }
  }
}