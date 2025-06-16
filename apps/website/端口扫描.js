import plugin from '../../../../lib/plugins/plugin.js';
import fs from 'fs';
import yaml from 'yaml';
import path from 'path';
import fetch from 'node-fetch';

export default class PortScanPlugin extends plugin {
    constructor() {
        super({
            name: '端口扫描',
            dsc: '执行端口扫描并返回结果',
            event: 'message',
            priority: 5000,
            rule: [
                {
                    reg: '^#端口扫描\\s*([\\w\\.-]+):?(\\d+)?$',
                    fnc: 'portScan'
                }
            ]
        });
    }

    async portScan(e) {
        // 权限验证
        const hasPermission = await this.checkPermission(e);
        if (!hasPermission) {
            await e.reply('暂无权限，只有主人才能操作');
            return true;
        }

        // 解析用户输入
        const input = e.msg.replace('#端口扫描', '').trim();
        const [host, port] = this.parseInput(input);
        
        if (!host) {
            await e.reply('请输入有效的域名或IP地址');
            return true;
        }
        if (!port || port < 1 || port > 65535) {
            await e.reply('端口号无效，请输入1-65535之间的端口号');
            return true;
        }

        try {
            // 获取API配置
            const [apiUrl, apiKey] = this.getApiConfig();
            if (!apiUrl || !apiKey) {
                await e.reply('API配置错误，请联系管理员');
                return true;
            }

            // 构建请求URL
            const requestUrl = `${apiUrl}?apikey=${apiKey}&url=${encodeURIComponent(host)}&port=${port}`;
            
            // 发送API请求
            const response = await fetch(requestUrl);
            const data = await response.json();

            // 处理API响应
            if (data.code === 1) {
                const status = data.data.isOpen === 1 ? '开放' : '关闭';
                await e.reply([
                    `🔍 端口扫描结果`,
                    `📍 地址: ${data.data.host}`,
                    `🚪 端口: ${data.data.port}`,
                    `📊 状态: ${status}`
                ].join('\n'));
            } else {
                await e.reply(`❌ 扫描失败: ${this.getErrorMessage(data.msg)}`);
            }
        } catch (err) {
            console.error('端口扫描错误:', err);
            await e.reply('⚠️ 扫描服务暂时不可用，请稍后再试');
        }

        return true;
    }

    // 解析用户输入
    parseInput(input) {
        const parts = input.split(':');
        let host = parts[0].trim();
        let port = parseInt(parts[1]) || 80;
        return [host, port];
    }

    // 获取API配置
    getApiConfig() {
        try {
            const basePath = path.join(process.cwd(), 'plugins/BXX-plugin');
            
            // 读取API地址
            const apiPath = path.join(basePath, 'data/API/website.yaml');
            const apiContent = fs.readFileSync(apiPath, 'utf8');
            const apiConfig = yaml.parse(apiContent);
            const apiUrl = apiConfig.DKSMAPI;
            
            // 读取API密钥
            const keyPath = path.join(basePath, 'data/KEY/website.yaml');
            const keyContent = fs.readFileSync(keyPath, 'utf8');
            const keyConfig = yaml.parse(keyContent);
            const apiKey = keyConfig.DKSMKEY;
            
            return [apiUrl, apiKey];
        } catch (err) {
            console.error('读取API配置失败:', err);
            return [null, null];
        }
    }

    // 错误消息映射
    getErrorMessage(code) {
        const errors = {
            100: 'API密钥为空',
            101: 'API密钥不存在',
            102: '来源地址不在白名单内',
            0: '链接不合法'
        };
        return errors[code] || `未知错误 (代码: ${code})`;
    }

    // 权限检查
    async checkPermission(e) {
        try {
            const basePath = path.join(process.cwd(), 'plugins/BXX-plugin');
            
            // 检查全局权限设置
            const adminPath = path.join(basePath, 'config/config/admin.yaml');
            const adminContent = fs.readFileSync(adminPath, 'utf8');
            const adminConfig = yaml.parse(adminContent);
            
            if (adminConfig.DKSMALL === true) {
                return true; // 所有人可用
            }
            
            // 检查主人权限
            const otherPath = path.join(process.cwd(), 'config/config/other.yaml');
            const otherContent = fs.readFileSync(otherPath, 'utf8');
            const otherConfig = yaml.parse(otherContent);
            
            const userId = e.user_id;
            const masterQQ = otherConfig.masterQQ || [];
            const masters = otherConfig.master || [];
            
            // 检查masterQQ列表
            if (masterQQ.some(qq => qq.toString() === userId.toString())) {
                return true;
            }
            
            // 检查master列表
            const isMaster = masters.some(entry => {
                const parts = entry.split(':');
                return parts[0] === userId.toString();
            });
            
            return isMaster;
        } catch (err) {
            console.error('权限检查失败:', err);
            return false;
        }
    }
}