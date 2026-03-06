import plugin from '../../../../lib/plugins/plugin.js'
import fs from 'fs'
import path from 'path'

export default class BXXConfig extends plugin {
  constructor() {
    super({
      name: '不羡仙设置',
      dsc: '管理不羡仙插件功能权限',
      event: 'message',
      priority: 5000,
      rule: [
        { reg: '^#不羡仙设置$', fnc: 'showConfig' },
        { reg: '^#不羡仙设置(二维码生成|抖音解析|综合解析)所有人可用(开启|关闭)$', fnc: 'updateConfig' },
        { reg: '^#不羡仙显示配置(admin)$', fnc: 'showConfigFile' }
      ]
    })
    this.rootPath = process.cwd()
  }

  getPluginPath(relativePath) {
    return path.resolve(this.rootPath, 'plugins/BXX-plugin', relativePath)
  }

  async isMaster(userId) {
    const otherPath = path.join(this.rootPath, 'config/config/other.yaml')
    try {
      const file = fs.readFileSync(otherPath, 'utf8')
      const lines = file.split('\n')
      const masterQQIndex = lines.findIndex(line => line.startsWith('masterQQ:'))
      if (masterQQIndex !== -1) {
        for (let i = masterQQIndex + 1; i < lines.length; i++) {
          const line = lines[i].trim()
          if (line.startsWith('-')) {
            const qq = line.replace(/^-\s*/, '').split(':')[0].trim()
            if (qq == userId) return true
          } else if (line.startsWith('master:')) {
            break
          }
        }
      }
      const masterIndex = lines.findIndex(line => line.startsWith('master:'))
      if (masterIndex !== -1) {
        for (let i = masterIndex + 1; i < lines.length; i++) {
          const line = lines[i].trim()
          if (line.startsWith('-')) {
            const masterId = line.replace(/^-\s*/, '').split(':')[0].trim()
            if (masterId == userId) return true
          } else {
            break
          }
        }
      }
    } catch (err) {
      console.error('读取权限配置失败:', err)
    }
    return false
  }

  async showConfig(e) {
    const configPath = this.getPluginPath('config/config/admin.yaml')
    try {
      if (!fs.existsSync(configPath)) {
        await e.reply(`配置文件不存在: ${configPath}`)
        return true
      }
      const file = fs.readFileSync(configPath, 'utf8')
      const lines = file.split('\n')
      const featureKeyMap = {
        '二维码生成': 'RWMALL',
        '抖音解析': 'DYJXALL',
        '综合解析': 'ZHJXALL'
      }
      const statusMap = {}
      for (const [feature, key] of Object.entries(featureKeyMap)) {
        const line = lines.find(l => l.trim().startsWith(`${key}:`))
        if (line) {
          const value = line.split(':')[1]?.trim()?.toLowerCase() === 'true'
          statusMap[feature] = value
        } else {
          statusMap[feature] = '未知'
        }
      }
      let msg = '【不羡仙功能权限设置】\n'
      for (const [feature, status] of Object.entries(statusMap)) {
        msg += `${feature}: ${status === '未知' ? '未知（配置缺失）' : status ? '开启' : '关闭'}\n`
      }
      msg += '\n【可用设置命令】\n'
      msg += '1. #不羡仙设置 [功能名] 所有人可用 [开启/关闭]\n'
      msg += '   例：#不羡仙设置抖音解析所有人可用开启\n'
      msg += '2. #不羡仙显示配置 admin\n'
      msg += '   查看 admin.yaml 配置内容\n'
      await e.reply(msg.trim())
    } catch (err) {
      console.error('读取配置失败:', err)
      await e.reply(`读取配置文件失败: ${err.message}`)
    }
    return true
  }

  async updateConfig(e) {
    const userId = e.user_id
    if (!(await this.isMaster(userId))) {
      await e.reply('暂无权限，只有主人才能操作')
      return true
    }
    const match = e.msg.match(/^#不羡仙设置(.+?)所有人可用(开启|关闭)$/)
    if (!match) return false
    const feature = match[1]
    const action = match[2] === '开启'
    const featureKeyMap = {
      '二维码生成': 'RWMALL',
      '抖音解析': 'DYJXALL',
      '综合解析': 'ZHJXALL'
    }
    const key = featureKeyMap[feature]
    if (!key) {
      await e.reply(`未知功能: ${feature}`)
      return true
    }
    const configPath = this.getPluginPath('config/config/admin.yaml')
    try {
      if (!fs.existsSync(configPath)) {
        await e.reply(`配置文件不存在: ${configPath}`)
        return true
      }
      let lines = fs.readFileSync(configPath, 'utf8').split('\n')
      let found = false
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith(`${key}:`)) {
          lines[i] = `${key}: ${action}`
          found = true
          break
        }
      }
      if (!found) lines.push(`${key}: ${action}`)
      fs.writeFileSync(configPath, lines.join('\n'))
      await e.reply(`不羡仙${feature}所有人可用${action ? '开启' : '关闭'}设置成功`)
    } catch (err) {
      console.error('更新配置失败:', err)
      await e.reply(`配置更新失败: ${err.message}`)
    }
    return true
  }

  async showConfigFile(e) {
    const userId = e.user_id
    if (!(await this.isMaster(userId))) {
      await e.reply('暂无权限，只有主人才能操作')
      return true
    }
    const match = e.msg.match(/^#不羡仙显示配置(admin)$/)
    if (!match) {
      await e.reply('格式错误，请使用：#不羡仙显示配置 admin')
      return true
    }
    const configPath = this.getPluginPath('config/config/admin.yaml')
    const fileName = 'admin.yaml'
    try {
      if (!fs.existsSync(configPath)) {
        await e.reply(`${fileName}配置文件不存在`)
        return true
      }
      const content = fs.readFileSync(configPath, 'utf8')
      let msg = `【${fileName}配置文件内容】\n`
      msg += content.length > 1000 ? content.substring(0, 1000) + '\n...(内容过长，已截断)' : content
      await e.reply(msg)
    } catch (err) {
      console.error('读取配置文件失败:', err)
      await e.reply(`读取${fileName}失败: ${err.message}`)
    }
    return true
  }
}
    
