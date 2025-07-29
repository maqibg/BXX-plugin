import plugin from '../../../../lib/plugins/plugin.js';
import fs from 'fs';
import path from 'path';

export default class BXXConfig extends plugin {
    constructor() {
        super({
            name: '不羡仙设置',
            dsc: '管理不羡仙插件功能权限',
            event: 'message',
            priority: 5000,
            rule: [
                {
                    reg: '^#不羡仙设置$',
                    fnc: 'showConfig'
                },
                {
                    reg: '^#不羡仙设置(网站信息|端口扫描|域名查询|二维码生成|备案信息|抖音解析|综合解析|邮箱发送)所有人可用(开启|关闭)$',
                    fnc: 'updateConfig'
                },
                {
                    reg: '^#老福特设置CK\\s*(.+)$',
                    fnc: 'setLftCookie'
                }
            ]
        });
        this.rootPath = process.cwd();
    }
    getPluginPath(relativePath) {
        return path.resolve(this.rootPath, 'plugins/BXX-plugin', relativePath);
    }
    async isMaster(userId) {
        const otherPath = path.join(this.rootPath, 'config/config/other.yaml');
        try {
            const file = fs.readFileSync(otherPath, 'utf8');
            const lines = file.split('\n');
            const masterQQIndex = lines.findIndex(line => line.startsWith('masterQQ:'));
            if (masterQQIndex !== -1) {
                for (let i = masterQQIndex + 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (line.startsWith('-')) {
                        const qq = line.replace(/^-\s*/, '').split(':')[0].trim();
                        if (qq == userId) return true;
                    } else if (line.startsWith('master:')) {
                        break;
                    }
                }
            }
            const masterIndex = lines.findIndex(line => line.startsWith('master:'));
            if (masterIndex !== -1) {
                for (let i = masterIndex + 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (line.startsWith('-')) {
                        const masterId = line.replace(/^-\s*/, '').split(':')[0].trim();
                        if (masterId == userId) return true;
                    } else {
                        break;
                    }
                }
            }
        } catch (err) {
            console.error('读取权限配置失败:', err);
        }
        return false;
    }
    async showConfig(e) {
        const configPath = this.getPluginPath('config/config/admin.yaml');
        try {
            const file = fs.readFileSync(configPath, 'utf8');
            const lines = file.split('\n');
            const statusMap = {
                '网站信息': lines[3]?.split(':')[1]?.trim() === 'true',
                '端口扫描': lines[5]?.split(':')[1]?.trim() === 'true',
                '域名查询': lines[7]?.split(':')[1]?.trim() === 'true',
                '二维码生成': lines[9]?.split(':')[1]?.trim() === 'true',
                '备案信息': lines[11]?.split(':')[1]?.trim() === 'true',
                '抖音解析': lines[13]?.split(':')[1]?.trim() === 'true',
                '综合解析': lines[15]?.split(':')[1]?.trim() === 'true',
                '邮箱发送': lines[18]?.split(':')[1]?.trim() === 'true'
            };
            
            let msg = '【不羡仙功能权限设置】\n';
            for (const [feature, status] of Object.entries(statusMap)) {
                msg += `${feature}: ${status ? '开启' : '关闭'}\n`;
            }
            
            e.reply(msg.trim());
        } catch (err) {
            console.error('读取配置失败:', err);
            e.reply(`获取配置失败: ${err.message}`);
        }
        return true;
    }
    async updateConfig(e) {
        const userId = e.user_id;
        if (!(await this.isMaster(userId))) {
            e.reply('暂无权限，只有主人才能操作');
            return true;
        }
        const match = e.msg.match(/^#不羡仙设置(.+?)所有人可用(开启|关闭)$/);
        if (!match) return false;
        const feature = match[1];
        const action = match[2] === '开启';
        const featureMap = {
            '网站信息': 3,  
            '端口扫描': 5,  
            '域名查询': 7,  
            '二维码生成': 9, 
            '备案信息': 11, 
            '抖音解析': 13,
            '综合解析': 15,
            '邮箱发送': 18
        };
        const lineIndex = featureMap[feature];
        if (lineIndex === undefined) {
            e.reply(`未知功能: ${feature}`);
            return true;
        }
        const configPath = this.getPluginPath('config/config/admin.yaml');
        try {
            let lines = fs.readFileSync(configPath, 'utf8').split('\n');
            if (lineIndex >= lines.length) {
                e.reply(`配置行[${lineIndex}]不存在`);
                return true;
            }
            const line = lines[lineIndex];
            let key = '';
            if (line.includes(':')) {
                key = line.split(':')[0].trim();
            } else {
                const keyMap = {
                    3: 'WZXXALL',
                    5: 'DKSMALL',
                    7: 'WSYMALL',
                    9: 'RWMALL',
                    11: 'ICPALL',
                    13: 'DYJXALL',
                    15: 'ZHJXALL',
                    18: 'YXFSALL',
                };
                key = keyMap[lineIndex];
            }
            lines[lineIndex] = `${key}: ${action}`;
            fs.writeFileSync(configPath, lines.join('\n'));
            e.reply(`不羡仙${feature}所有人可用${action ? '开启' : '关闭'}设置成功`);
        } catch (err) {
            console.error('更新配置失败:', err);
            e.reply(`配置更新失败: ${err.message}`);
        }
        return true;
    }
    async setLftCookie(e) {
        const userId = e.user_id;
        if (!(await this.isMaster(userId))) {
            e.reply('暂无权限，只有主人才能操作');
            return true;
        }
        const ck = e.msg.replace(/^#老福特设置CK\s*/, '').trim();
        if (!ck) {
            e.reply('请提供有效的Cookie');
            return true;
        }
        const ckPath = this.getPluginPath('data/Cookie/LFTCK.yaml');
        try {
            let lines = fs.readFileSync(ckPath, 'utf8').split('\n');
            if (lines.length < 2) {
                lines = [
                    '# 老福特Cookie',
                    `LFTCK: "${ck}"`
                ];
            } else {
                lines[1] = `LFTCK: "${ck}"`;
            }
            fs.writeFileSync(ckPath, lines.join('\n'));
            e.reply('老福特Cookie设置成功');
        } catch (err) {
            console.error('设置Cookie失败:', err);
            e.reply(`Cookie设置失败: ${err.message}`);
        }
        return true;
    }
}