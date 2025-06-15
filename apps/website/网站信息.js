import plugin from '../../../../lib/plugins/plugin.js';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

export default class extends plugin {
    constructor() {
        super({
            name: '网站信息查询',
            dsc: '获取网站标题、描述和Logo',
            event: 'message',
            priority: 5000,
            rule: [
                {
                    reg: '^#网站信息\\s*\\+?\\s*(https?://[\\w.-]+\\.[a-z]{2,}(?:/\\S*)?)',
                    fnc: 'getWebsiteInfo'
                }
            ]
        });
    }

    async getWebsiteInfo(e) {
        if (!(await this.checkPermission(e))) {
            await e.reply('暂无权限，只有主人才能操作');
            return true;
        }

        const url = e.match[1];
        try {
            const { apiUrl, apiKey } = await this.getApiConfig();
            if (!apiUrl || !apiKey) {
                await e.reply('网站信息API配置不完整，请检查配置');
                return true;
            }

            const apiFullUrl = `${apiUrl}?apikey=${apiKey}&url=${encodeURIComponent(url)}`;
            const response = await axios.get(apiFullUrl, { timeout: 10000 });
            const res = response.data;

            if (res.code !== 1) {
                return await this.handleApiError(res, e);
            }

            await this.sendWebsiteInfo(e, res.data, url);
        } catch (err) {
            console.error(`网站信息查询失败: ${err}`);
            await e.reply('网站信息查询失败，请稍后重试或检查链接有效性');
        }
        return true;
    }

    async checkPermission(e) {
        const adminPath = path.join(
            process.cwd(), 
            'plugins/BXX-plugin/config/config/admin.yaml'
        );
        
        try {
            if (fs.existsSync(adminPath)) {
                const adminConfig = fs.readFileSync(adminPath, 'utf8');
                const wzxxAll = adminConfig.match(/WZXXALL:\s*(true|false)/);
                
                if (wzxxAll && wzxxAll[1] === 'true') return true;
            }
        } catch (err) {
            console.error('读取权限配置失败:', err);
        }

        return this.checkMaster(e);
    }

    async checkMaster(e) {
        const otherPath = path.join(
            process.cwd(), 
            'config/config/other.yaml'
        );

        try {
            if (fs.existsSync(otherPath)) {
                const otherConfig = fs.readFileSync(otherPath, 'utf8');
                const userId = e.user_id;
                
                const masterQQRegex = /masterQQ:\s*[\r\n]+([\s\S]*?)(?=\r?\n\w|$)/;
                const masterQQMatch = otherConfig.match(masterQQRegex);
                
                if (masterQQMatch) {
                    const masterQQList = masterQQMatch[1].split('\n')
                        .filter(line => line.trim().startsWith('-'))
                        .map(line => line.replace(/^-\s*/, '').trim());
                    
                    if (masterQQList.includes(userId.toString()) {
                        return true;
                    }
                }
                
                const masterRegex = /master:\s*[\r\n]+([\s\S]*?)(?=\r?\n\w|$)/;
                const masterMatch = otherConfig.match(masterRegex);
                
                if (masterMatch) {
                    const masterList = masterMatch[1].split('\n')
                        .filter(line => line.trim().startsWith('-'))
                        .map(line => line.replace(/^-\s*/, '').trim());
                    
                    for (const item of masterList) {
                        if (item.includes(':')) {
                            const parts = item.split(':');
                            if (parts.length >= 2 && parts[parts.length - 1] === userId.toString()) {
                                return true;
                            }
                        }
                        else if (item === userId.toString()) {
                            return true;
                        }
                    }
                }
            }
        } catch (err) {
            console.error('读取主人配置失败:', err);
        }
        return false;
    }

    async getApiConfig() {
        const apiPath = path.join(
            process.cwd(), 
            'plugins/BXX-plugin/data/API/website.yaml'
        );
        const keyPath = path.join(
            process.cwd(), 
            'plugins/BXX-plugin/data/KEY/website.yaml'
        );

        try {
            let apiUrl = null, apiKey = null;
            
            if (fs.existsSync(apiPath)) {
                const apiConfig = fs.readFileSync(apiPath, 'utf8');
                const apiMatch = apiConfig.match(/WZXXAPI:\s*"([^"]+)"/);
                apiUrl = apiMatch ? apiMatch[1] : null;
            }
            
            if (fs.existsSync(keyPath)) {
                const keyConfig = fs.readFileSync(keyPath, 'utf8');
                const keyMatch = keyConfig.match(/WZXXKEY:\s*"([^"]+)"/);
                apiKey = keyMatch ? keyMatch[1] : null;
            }
            
            return { apiUrl, apiKey };
        } catch (err) {
            console.error('读取API配置失败:', err);
            return { apiUrl: null, apiKey: null };
        }
    }

    async handleApiError(res, e) {
        const errorMap = {
            100: 'API密钥未配置',
            101: 'API密钥无效',
            102: '来源地址不在白名单',
            0: '链接不合法或无法访问'
        };
        
        const errorMsg = errorMap[res.code] || `未知错误 (代码: ${res.code})`;
        await e.reply(`网站信息获取失败: ${errorMsg}\n${res.msg || ''}`);
        return true;
    }

    async sendWebsiteInfo(e, data, url) {
        const uploadDir = path.join(
            process.cwd(), 
            'plugins/BXX-plugin/uploads'
        );
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const logoUrl = data.favicon || '';
        let logoPath = '';
        
        if (logoUrl) {
            try {
                const ext = path.extname(logoUrl) || '.png';
                logoPath = path.join(uploadDir, `website_logo_${Date.now()}${ext}`);
                
                const response = await axios.get(logoUrl, {
                    responseType: 'arraybuffer',
                    timeout: 10000
                });
                
                fs.writeFileSync(logoPath, response.data);
            } catch (err) {
                console.error('Logo下载失败:', err);
            }
        }

        let msg = [
            `🖥️ 网站标题: ${data.title || '无'}`,
            `🔍 关键词: ${data.keywords || '无'}`,
            `📝 描述: ${data.description || '无'}`,
            `🔗 源链接: ${url}`
        ];

        if (logoPath && fs.existsSync(logoPath)) {
            msg.push(segment.image(`file:///${logoPath}`));
        } else {
            msg.push('⚠️ 网站Logo获取失败');
        }

        await e.reply(msg);

        if (logoPath && fs.existsSync(logoPath)) {
            setTimeout(() => {
                fs.unlink(logoPath, (err) => {
                    if (err) console.error('删除临时文件失败:', err);
                });
            }, 3000); 
        }
    }
}