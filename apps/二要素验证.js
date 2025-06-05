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
  }


  async checkPermission(userId) {
    try {
      const adminConfig = yaml.parse(fs.readFileSync(this.adminConfigPath, 'utf8'));
      if (adminConfig.allowAll === true) {
        return true;
      }
      
      const otherConfig = yaml.parse(fs.readFileSync(this.otherConfigPath, 'utf8'));
      
      if (otherConfig.masterQQ && otherConfig.masterQQ.some(item => {
        const [qq, ..._] = item.split(':');
        return qq === userId.toString();
      })) {
        return true;
      }
      
      if (otherConfig.master && otherConfig.master.some(item => {
        const parts = item.split(':');
        return parts[parts.length - 1] === userId.toString();
      })) {
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('权限检查出错:', err);
      return false;
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
请勿使用本功能进行违反违规活动！否则将全局拉黑。
请勿在人多且有坏人的地方使用该功能，如被泄漏信息与本插件无关。
请确认好您的使用权限，避免被有心之人使用进行违规操作。
最后声明：任何问题均与不羡仙插件无关，不羡仙插件无保护您隐私的责任。`);
    
    try {

      const apiUrl = this.getApiUrl();
      const requestUrl = `${apiUrl}name=${encodeURIComponent(name)}&id=${encodeURIComponent(idCard)}`;
      
      const response = await fetch(requestUrl);
      const data = await response.json();
      
      if (data.code === 1) {
        await e.reply('✅ 姓名与身份证号码验证成功\n二要素验证已通过\n请撤回命令消息');
      } else if (data.code === 0) {
        await e.reply('❌ 身份证号码/姓名格式错误，请检查！');
      } else {
        await e.reply('⚠️ 验证服务返回未知结果，请稍后再试');
      }
    } catch (err) {
      console.error('API请求出错:', err);
      await e.reply('⚠️ 验证服务配置错误，请联系管理员');
      return true;
    }
    
    return true;
  }
}