import plugin from '../../../lib/plugins/plugin.js'
import fs from 'fs'
import yaml from 'yaml'

export default class ModifyPermission extends plugin {
  constructor() {
    super({
      name: '修改权限',
      dsc: '管理身份验证权限',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^#身份验证所有人可用(开启|关闭)$',
          fnc: 'modifyPermission'
        }
      ]
    })
  }

  async modifyPermission(e) {
    if (!(await this.checkMaster(e))) {
      await e.reply('该权限仅主人可用')
      return true
    }

    const action = e.msg.includes('开启') ? true : false
    const result = await this.updateAdminConfig(action)
    
    await e.reply(result ? '身份验证权限修改成功' : '身份验证权限修改失败！')
    return true
  }

  async checkMaster(e) {
    try {

      const configPath = `${process.cwd()}/config/config/other.yaml`
      if (!fs.existsSync(configPath)) return false
      
      const config = yaml.parse(fs.readFileSync(configPath, 'utf8'))
      const userId = String(e.user_id)

      if (config.masterQQ) {
        for (const item of config.masterQQ) {
          if (typeof item === 'string') {
            const [id] = item.split(':')
            if (id === userId) return true
          }
        }
      }


      if (config.master) {
        for (const item of config.master) {
          if (typeof item === 'string') {
            const parts = item.split(':')
            if (parts.length >= 2 && parts[1] === userId) return true
          }
        }
      }
      
      return false
    } catch (err) {
      console.error('权限检查错误:', err)
      return false
    }
  }

  async updateAdminConfig(value) {
    try {
      const adminPath = `${process.cwd()}/plugins/BXX-plugin/config/config/admin.yaml`
      
      let adminConfig = {}
      if (fs.existsSync(adminPath)) {
        adminConfig = yaml.parse(fs.readFileSync(adminPath, 'utf8'))
      }
      
      adminConfig.all = value
      
      fs.writeFileSync(adminPath, yaml.stringify(adminConfig))
      return true
    } catch (err) {
      console.error('配置更新错误:', err)
      return false
    }
  }
}