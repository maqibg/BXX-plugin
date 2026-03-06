import fs from 'fs'
import path from 'path'
import yaml from 'yaml'

const configDir = path.resolve('./plugins/BXX-plugin/')
const adminPath = path.join(configDir, 'config/config/admin.yaml')
const websiteApiPath = path.join(configDir, 'data/API/website.yaml')
const websiteKeyPath = path.join(configDir, 'data/KEY/website.yaml')
const zhjxApiPath = path.join(configDir, 'data/API/ZHJXAPI.yaml')
const zhjxKeyPath = path.join(configDir, 'data/KEY/ZHJXKEY.yaml')

function readYamlConfig(filePath, key, defaultValue = "") {
  try {
    if (!fs.existsSync(filePath)) return defaultValue
    const stats = fs.statSync(filePath)
    if (stats.size === 0) return defaultValue
    const content = fs.readFileSync(filePath, 'utf8')
    let parsed = {}
    try {
      parsed = yaml.parse(content) || {}
    } catch {
      const keyValueMatch = content.match(new RegExp(`${key}:\\s*(.*?)(\\s*#|\\s*$)`))
      if (keyValueMatch && keyValueMatch[1]) {
        const rawValue = keyValueMatch[1].trim()
        if (rawValue.startsWith('"') && rawValue.endsWith('"')) return rawValue.slice(1, -1)
        if (rawValue === 'true' || rawValue === 'false') return rawValue === 'true'
        if (!isNaN(rawValue)) return Number(rawValue)
        return rawValue
      }
      return defaultValue
    }
    if (parsed[key] !== undefined && parsed[key] !== null) return parsed[key]
    const keys = Object.keys(parsed)
    if (keys.length > 0) return parsed[keys[0]]
    const lines = content.split('\n')
    for (const line of lines) {
      if (line.trim().startsWith(`${key}:`)) {
        const parts = line.split(':')
        if (parts.length > 1) {
          let value = parts.slice(1).join(':').trim()
          if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
          return value
        }
      }
    }
    return defaultValue
  } catch {
    return defaultValue
  }
}

function writeYamlConfig(filePath, key, value) {
  try {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    let lines = []
    let found = false
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8')
      lines = content.split('\n')
    }
    const newLines = []
    for (const line of lines) {
      if (line.trim().startsWith(`${key}:`)) {
        const indent = line.match(/^\s*/)[0] || ''
        const formattedValue = typeof value === 'string' ? `"${value}"` : value
        newLines.push(`${indent}${key}: ${formattedValue}`)
        found = true
      } else {
        newLines.push(line)
      }
    }
    if (!found) {
      const formattedValue = typeof value === 'string' ? `"${value}"` : value
      newLines.push(`${key}: ${formattedValue}`)
    }
    fs.writeFileSync(filePath, newLines.join('\n'))
    return true
  } catch {
    return false
  }
}

export function supportGuoba() {
  return {
    pluginInfo: {
      name: '不羡仙插件',
      title: 'BXX-plugin',
      author: '@不羡仙',
      authorLink: 'https://github.com/maqibg',
      link: 'https://github.com/maqibg/BXX-plugin',
      isV3: true,
      isV2: false,
      description: '不羡仙插件（自用精简版）',
      icon: 'mdi:application-cog',
      iconColor: '#9C27B0'
    },
    configInfo: {
      schemas: [
        {
          component: 'Divider',
          label: '权限配置',
          componentProps: {
            orientation: 'left',
            plain: true,
            style: { marginTop: '20px', borderColor: '#4CAF50', fontSize: '18px' }
          }
        },
        {
          field: 'RWMALL',
          label: '二维码生成所有人可用',
          component: 'Switch',
          componentProps: { checkedChildren: '开启', unCheckedChildren: '关闭', style: { width: 'fit-content' } }
        },
        {
          field: 'DYJXALL',
          label: '抖音解析所有人可用',
          component: 'Switch',
          componentProps: { checkedChildren: '开启', unCheckedChildren: '关闭', style: { width: 'fit-content' } }
        },
        {
          field: 'ZHJXALL',
          label: '综合解析所有人可用',
          component: 'Switch',
          componentProps: { checkedChildren: '开启', unCheckedChildren: '关闭', style: { width: 'fit-content' } }
        },
        {
          component: 'Divider',
          label: 'API 配置',
          componentProps: {
            orientation: 'left',
            plain: true,
            style: { marginTop: '30px', borderColor: '#2196F3', fontSize: '18px' }
          }
        },
        { field: 'RWMAPI', label: '二维码生成API', component: 'Input', required: false, componentProps: { placeholder: '输入API地址' } },
        { field: 'ZHJXAPI', label: '综合解析API', component: 'Input', required: false, componentProps: { placeholder: '输入API地址' } },
        {
          component: 'Divider',
          label: 'KEY 配置',
          componentProps: {
            orientation: 'left',
            plain: true,
            style: { marginTop: '30px', borderColor: '#FF9800', fontSize: '18px' }
          }
        },
        { field: 'RWMKEY', label: '二维码生成KEY', component: 'InputPassword', required: false, componentProps: { placeholder: '输入KEY值', showPassword: true } },
        { field: 'ZHJXKEY', label: '综合解析KEY', component: 'InputPassword', required: false, componentProps: { placeholder: '输入KEY值', showPassword: true } }
      ],
      getConfigData() {
        return {
          RWMALL: readYamlConfig(adminPath, 'RWMALL', true),
          DYJXALL: readYamlConfig(adminPath, 'DYJXALL', true),
          ZHJXALL: readYamlConfig(adminPath, 'ZHJXALL', true),
          RWMAPI: readYamlConfig(websiteApiPath, 'RWMAPI', ''),
          ZHJXAPI: readYamlConfig(zhjxApiPath, 'ZHJXAPI', ''),
          RWMKEY: readYamlConfig(websiteKeyPath, 'RWMKEY', ''),
          ZHJXKEY: readYamlConfig(zhjxKeyPath, 'ZHJXKEY', '')
        }
      },
      setConfigData(configData) {
        const results = [
          writeYamlConfig(adminPath, 'RWMALL', configData.RWMALL),
          writeYamlConfig(adminPath, 'DYJXALL', configData.DYJXALL),
          writeYamlConfig(adminPath, 'ZHJXALL', configData.ZHJXALL),
          writeYamlConfig(websiteApiPath, 'RWMAPI', configData.RWMAPI),
          writeYamlConfig(zhjxApiPath, 'ZHJXAPI', configData.ZHJXAPI),
          writeYamlConfig(websiteKeyPath, 'RWMKEY', configData.RWMKEY),
          writeYamlConfig(zhjxKeyPath, 'ZHJXKEY', configData.ZHJXKEY)
        ]
        return results.every(Boolean)
      }
    }
  }
}

