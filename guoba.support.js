import fs from 'fs'
import path from 'path'
import yaml from 'yaml'

const configDir = path.resolve('./plugins/BXX-plugin/')
const lftckPath = path.join(configDir, 'data/Cookie/LFTCK.yaml')
const sfyzkPath = path.join(configDir, 'data/API/SFYZKEY.yaml')
const sfyzaPath = path.join(configDir, 'data/API/SFYZAPI.yaml')
const tpapiPath = path.join(configDir, 'data/API/TPAPI.yaml')
const adminPath = path.join(configDir, 'config/config/admin.yaml')

// 支持锅巴插件
export function supportGuoba() {

  function readYamlConfig(filePath, defaultValue = "") {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8')
        const parsed = yaml.parse(content)

        const keys = Object.keys(parsed)
        return keys.length > 0 ? parsed[keys[0]] : defaultValue
      }
      return defaultValue
    } catch (e) {
      console.error(`读取配置文件失败 (${path.basename(filePath)}):`, e)
      return defaultValue
    }
  }

  function writeYamlConfig(filePath, key, value, comment = "") {
    try {
      const dir = path.dirname(filePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      
      let content = ""
      if (comment) content += `# ${comment}\n`
      content += `${key}: ${typeof value === 'string' ? `"${value}"` : value}`
      
      fs.writeFileSync(filePath, content)
      return true
    } catch (e) {
      console.error(`写入配置文件失败 (${path.basename(filePath)}):`, e)
      return false
    }
  }

  function configNote(filePath) {
    const relativePath = path.relative(process.cwd(), filePath)
    return `保存位置: ${relativePath}`
  }

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
        // 分区：Cookie配置
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
          helpMessage: '必填项 | 用于老福特平台登陆',
          bottomHelpMessage: '使用VIA浏览器或使用电脑F12获取CK 登录老福特后获取Cookie 重启生效CK可用时长约48h',
          component: 'InputPassword',
          required: true,
          componentProps: {
            placeholder: '在此输入Cookie值',
            showPassword: true
          }
        },

        // 分区：API配置
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
            placeholder: '输入SFYZ密钥',
            showPassword: true
          }
        },

        {
          field: 'SFYZAPI',
          label: '身份验证 API地址',
          helpMessage: 'API地址',
          bottomHelpMessage: '身份验证API接口，如你不懂不羡仙API接口地址逻辑请勿修改',
          component: 'Input',
          required: false,
          componentProps: {
            placeholder: 'https://api.example.com/endpoint'
          }
        },

        {
          field: 'TPAPI',
          label: '图片API 配置',
          helpMessage: '第三方API配置',
          bottomHelpMessage: '图片API接口地址，如你不懂接口书写/请求逻辑请勿随意修改',
          component: 'Input',
          required: false,
          componentProps: {
            placeholder: '输入API地址'
          }
        },

        // 分区：权限配置
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
          LFTCK: readYamlConfig(lftckPath, ""),
          SFYZKEY: readYamlConfig(sfyzkPath, ""),
          SFYZAPI: readYamlConfig(sfyzaPath, ""),
          TPAPI: readYamlConfig(tpapiPath, ""),
          adminAll: readYamlConfig(adminPath, false)
        }
      },
      
      // 新增：保存配置数据
      setConfigData(data) {
        const { LFTCK, SFYZKEY, SFYZAPI, TPAPI, adminAll } = data;
        
        // 写入各配置文件
        writeYamlConfig(lftckPath, 'LFTCK', LFTCK, '老福特Cookie');
        writeYamlConfig(sfyzkPath, 'SFYZKEY', SFYZKEY, '身份验证密钥');
        writeYamlConfig(sfyzaPath, 'SFYZAPI', SFYZAPI, '身份验证API地址');
        writeYamlConfig(tpapiPath, 'TPAPI', TPAPI, '图片API配置');
        
        // 特殊处理布尔值
        writeYamlConfig(adminPath, 'adminAll', !!adminAll, '身份验证权限');
        
        return true;
      },
      
      // 新增：字段保存位置提示
      setNote: (field) => {
        const notes = {
          LFTCK: configNote(lftckPath),
          SFYZKEY: configNote(sfyzkPath),
          SFYZAPI: configNote(sfyzaPath),
          TPAPI: configNote(tpapiPath),
          adminAll: configNote(adminPath)
        };
        return notes[field] || '';
      }
    }
  }
}