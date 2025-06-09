import plugin from '../../../lib/plugins/plugin.js';
import fs from 'fs';
import yaml from 'yaml';
import fetch from 'node-fetch';

export class IdentityVerification extends plugin {
  constructor() {
    super({
      name: '身份二要素验证',
      dsc: '身份证二要素验证插件',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^#身份验证(.+?):(.+)$',
          fnc: 'verifyIdentity'
        }
      ]
    });

    this.otherConfigPath = './config/config/other.yaml';
    this.adminConfigPath = './plugins/BXX-plugin/config/config/admin.yaml';
    this.apiConfigPath = './plugins/BXX-plugin/data/API/SFYZAPI.yaml';
    this.apiKeyPath = './plugins/BXX-plugin/data/API/SFYZKEY.yaml';
  }

  async checkPermission(userId) {
    try {
      const adminConfig = yaml.parse(fs.readFileSync(this.adminConfigPath, 'utf8'));
      if (adminConfig.allowAll === true) {
        return true;
      }
      
      const otherConfig = yaml.parse(fs.readFileSync(this.otherConfigPath, 'utf8'));
      const userIdStr = userId.toString();
      

      if (otherConfig.masterQQ && Array.isArray(otherConfig.masterQQ)) {
        for (const item of otherConfig.masterQQ) {

          const qq = typeof item === 'string' && item.includes(':') 
            ? item.split(':')[0].trim()
            : String(item).trim();
            
          if (qq === userIdStr) {
            return true;
          }
        }
      }
      

      if (otherConfig.master && Array.isArray(otherConfig.master)) {
        for (const item of otherConfig.master) {
          if (typeof item === 'string') {
            const parts = item.split(':');

            const idPart = parts[parts.length - 1].trim();
            if (idPart === userIdStr) {
              return true;
            }
          }
        }
      }
      
      return false;
    } catch (err) {
      console.error('权限检查出错:', err);
      return false;
    }
  }

  getApiKey() {
    try {
      if (!fs.existsSync(this.apiKeyPath)) {
        throw new Error('API密钥配置文件不存在');
      }
      
      const apiKeyConfig = yaml.parse(fs.readFileSync(this.apiKeyPath, 'utf8'));
      
      if (!apiKeyConfig || !apiKeyConfig.SFYZKEY) {
        throw new Error('API密钥配置缺失：SFYZKEY字段不存在');
      }
      
      return apiKeyConfig.SFYZKEY;
    } catch (err) {
      console.error('读取API密钥出错:', err);
      throw err;
    }
  }

  getApiUrl() {
    try {
      const apiConfig = yaml.parse(fs.readFileSync(this.apiConfigPath, 'utf8'));
      
      if (!apiConfig || !apiConfig.SFYZAPI) {
        throw new Error('API配置缺失：SFYZAPI字段不存在');
      }
      
      return apiConfig.SFYZAPI;
    } catch (err) {
      console.error('读取API配置出错:', err);
      throw err; 
    }
  }
 
  async verifyIdentity(e) {
    const userId = e.user_id;
    const name = e.msg.match(/#身份验证(.+?):/)[1].trim();
    const idCard = e.msg.split(':')[1].trim();
    
    const hasPermission = await this.checkPermission(userId);
    if (!hasPermission) {
      await e.reply('⚠️ 该命令仅主人可用');
      return true;
    }

    await e.reply(`⚠️ 免责声明：
不羡仙插件提供免费的二要素功能仅用于学习交流娱乐
不会收集/记录/分享/保存/泄漏您提供的身份信息
发送命令后请及时撤回！以免信息泄漏。
本功能涉及接口权限黑白名单原因
需要您加入不羡仙插件群聊或到yunz.cc提交工单拉白才可使用！
加入不羡仙群聊找群主或注册yunz.cc提交过白工单拉白即可
请勿使用本功能进行违反违规活动！否则将全局拉黑。
请勿在人多且有坏人的地方使用该功能，如被泄漏信息与本插件无关。
请确认好您的使用权限，避免被有心之人使用进行违规操作。
最后声明：任何问题均与不羡仙插件无关，不羡仙插件无保护您隐私的责任。`);
    
    try {
      const apiUrl = this.getApiUrl();
      const apiKey = this.getApiKey();
      
      const requestUrl = `${apiUrl}apikey=${encodeURIComponent(apiKey)}&name=${encodeURIComponent(name)}&id=${encodeURIComponent(idCard)}`;
      
      const response = await fetch(requestUrl);
      const data = await response.json();
      

      if (data.code === 1) {
        await e.reply('✅ 姓名与身份证号码验证成功\n二要素验证已通过\n请撤回命令消息');
      } else if (data.code === 0) {
        await e.reply('❌ 身份证号码/姓名格式错误，请检查！');
      } else if (data.code === 102) {
        await e.reply('❌ 您的IP不在白名单内！请加入不羡仙插件群聊拉白使用！');
      } else {
        await e.reply(`⚠️ 验证服务返回未知结果：${data.msg || '请稍后再试'}`);
      }
    } catch (err) {
      console.error('API请求出错:', err);
      
      let errorMsg = '⚠️ 验证服务配置错误，请联系管理员';
      if (err.message.includes('API密钥配置文件不存在')) {
        errorMsg = '⚠️ API密钥配置文件不存在，请检查路径';
      } else if (err.message.includes('SFYZKEY字段不存在')) {
        errorMsg = '⚠️ API密钥配置错误：缺少SFYZKEY字段';
      } else if (err.message.includes('API配置缺失')) {
        errorMsg = '⚠️ API基础URL配置错误';
      }
      
      await e.reply(errorMsg);
      return true;
    }
    
    return true;
  }
}