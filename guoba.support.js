import fs from 'fs'
import path from 'path'
import yaml from 'yaml'

const configDir = path.resolve('./plugins/BXX-plugin/')
const lftckPath = path.join(configDir, 'data/Cookie/LFTCK.yaml')
const sfyzkPath = path.join(configDir, 'data/API/SFYZKEY.yaml')
const sfyzaPath = path.join(configDir, 'data/API/SFYZAPI.yaml')
const tpapiPath = path.join(configDir, 'data/API/TPAPI.yaml')
const adminPath = path.join(configDir, 'config/config/admin.yaml')

function readYamlConfig(filePath, key, defaultValue = "") {
    try {
        if (!fs.existsSync(filePath)) {
            console.log(`[BXX] 配置文件不存在: ${filePath}`)
            return defaultValue
        }
        
        const stats = fs.statSync(filePath)
        if (stats.size === 0) {
            console.log(`[BXX] 配置文件为空: ${filePath}`)
            return defaultValue
        }
        
        const content = fs.readFileSync(filePath, 'utf8')
        
        let parsed = {}
        try {
            parsed = yaml.parse(content) || {}
        } catch (parseError) {
            console.error(`[BXX] YAML解析错误！ (${path.basename(filePath)}):`, parseError)
        
            const keyValueMatch = content.match(new RegExp(`${key}:\\s*(.*?)(\\s*#|\\s*$)`))
            if (keyValueMatch && keyValueMatch[1]) {
                const rawValue = keyValueMatch[1].trim()
                
                if (rawValue.startsWith('"') && rawValue.endsWith('"')) {
                    return rawValue.slice(1, -1)
                } else if (rawValue === 'true' || rawValue === 'false') {
                    return rawValue === 'true'
                } else if (!isNaN(rawValue)) {
                    return Number(rawValue)
                } else {
                    return rawValue
                }
            }
            
            return defaultValue
        }
        
        if (parsed[key] !== undefined && parsed[key] !== null) {
            return parsed[key]
        }
        
        const keys = Object.keys(parsed)
        if (keys.length > 0) {
            return parsed[keys[0]]
        }
        
        const lines = content.split('\n')
        for (const line of lines) {
            if (line.trim().startsWith(`${key}:`)) {
                const parts = line.split(':')
                if (parts.length > 1) {
                    let value = parts.slice(1).join(':').trim()
                    if (value.startsWith('"') && value.endsWith('"')) {
                        value = value.slice(1, -1)
                    }
                    
                    return value
                }
            }
        }
        
        return defaultValue
    } catch (e) {
        console.error(`[BXX] 读取配置文件失败 (${path.basename(filePath)}):`, e)
        return defaultValue
    }
}


function writeYamlConfig(filePath, key, value) {
    try {
        const dir = path.dirname(filePath)
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }
        
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
                const comment = line.includes('#') ? line.split('#')[1] : null
                const formattedValue = typeof value === 'string' 
                    ? `"${value}"` 
                    : value
                
                let newLine = `${indent}${key}: ${formattedValue}`
                if (comment) {
                    newLine += ` #${comment}`
                }
                
                newLines.push(newLine)
                found = true
            } else {
                newLines.push(line)
            }
        }
        
        if (!found) {
            const formattedValue = typeof value === 'string' 
                ? `"${value}"` 
                : value
            
            newLines.push(`${key}: ${formattedValue}`)
        }

        fs.writeFileSync(filePath, newLines.join('\n'))
        return true
    } catch (e) {
        console.error(`[BXX] 写入配置文件失败 (${path.basename(filePath)}):`, e)
        return false
    }
}

export function supportGuoba() {
    return {
        pluginInfo: {
            name: 'BXX-plugin',
            title: 'BXX-plugin',
            author: '@不羡仙',
            authorLink: 'https://gitcode.com/bxianx',
            link: 'https://gitcode.com/bxianx/BXX-plugin/',
            isV3: true,
            isV2: false,
            description: 'BXX-plugin',
            icon: 'mdi:application-cog',
            iconColor: '#9C27B0'
        },
        configInfo: {
            schemas: [
                // Cookie配置分区
                {
                    component: 'Divider',
                    label: 'Cookie 配置',
                    componentProps: {
                        orientation: 'left',
                        plain: true,
                        style: { 
                            marginTop: '20px',
                            borderColor: '#FF5722'
                        }
                    }
                },
                {
                    field: 'LFTCK',
                    label: '老福特Cookie',
                    helpMessage: '用于绕过老福特登陆',
                    bottomHelpMessage: '使用VIA浏览器或使用电脑F12获取CK 登录老福特后获取Cookie 重启生效CK可用时长约48h',
                    component: 'InputPassword',
                    required: false,
                    componentProps: {
                        placeholder: '在此输入Cookie值',
                        showPassword: true
                    }
                },

                // API配置分区
                {
                    component: 'Divider',
                    label: 'API 配置',
                    componentProps: {
                        orientation: 'left',
                        plain: true,
                        style: { 
                            marginTop: '30px',
                            borderColor: '#2196F3'
                        }
                    }
                },
                {
                    field: 'SFYZKEY',
                    label: '身份验证 密钥',
                    helpMessage: '用于API认证的安全密钥KEY',
                    bottomHelpMessage: '身份验证API接口平台KEY，如你不懂不羡仙API平台加密方式请勿修改',
                    component: 'InputPassword',
                    required: false,
                    componentProps: {
                        placeholder: '输入身份验证密钥',
                        showPassword: true
                    }
                },
                {
                    field: 'SFYZAPI',
                    label: '身份验证 API地址',
                    helpMessage: '请求的API接口地址',
                    bottomHelpMessage: '身份验证API接口，如你不懂不羡仙API接口地址逻辑请勿修改',
                    component: 'Input',
                    required: false,
                    componentProps: {
                        placeholder: 'https://api.bxxov.com/endpoint'
                    }
                },
                {
                    field: 'TPAPI',
                    label: '图片API 配置',
                    helpMessage: '图片API配置',
                    bottomHelpMessage: '图片API接口地址，如你不懂不羡仙接口书写/请求逻辑请勿随意修改',
                    component: 'Input',
                    required: false,
                    componentProps: {
                        placeholder: '输入API地址'
                    }
                },

                // 权限配置分区
                {
                    component: 'Divider',
                    label: '权限配置',
                    componentProps: {
                        orientation: 'left',
                        plain: true,
                        style: { 
                            marginTop: '30px',
                            borderColor: '#4CAF50'
                        }
                    }
                },
                {
                    field: 'adminAll',
                    label: '身份验证权限',
                    helpMessage: '控制功能使用权限',
                    bottomHelpMessage: '开启后所有用户均可使用身份验证功能',
                    component: 'Switch',
                    componentProps: {
                        checkedChildren: '开启',
                        unCheckedChildren: '关闭',
                        style: { width: 'fit-content' }
                    }
                },
            ],
            
            // 获取当前配置数据
            getConfigData() {
                return {
                    LFTCK: readYamlConfig(lftckPath, 'LFTCK', ""),
                    SFYZKEY: readYamlConfig(sfyzkPath, 'SFYZKEY', ""),
                    SFYZAPI: readYamlConfig(sfyzaPath, 'SFYZAPI', ""),
                    TPAPI: readYamlConfig(tpapiPath, 'TPAPI', ""),
                    adminAll: readYamlConfig(adminPath, 'adminAll', false)
                }
            },
            
            // 保存配置数据
            setConfigData(configData) {
                const results = [
                    writeYamlConfig(lftckPath, 'LFTCK', configData.LFTCK),
                    writeYamlConfig(sfyzkPath, 'SFYZKEY', configData.SFYZKEY),
                    writeYamlConfig(sfyzaPath, 'SFYZAPI', configData.SFYZAPI),
                    writeYamlConfig(tpapiPath, 'TPAPI', configData.TPAPI),
                    writeYamlConfig(adminPath, 'adminAll', configData.adminAll)
                ]
                
                return results.every(Boolean)
            }
        }
    }
}