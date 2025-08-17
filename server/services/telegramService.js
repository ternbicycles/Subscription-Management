const axios = require('axios');
const config = require('../config');

class TelegramService {
    constructor() {
        this.botToken = process.env.TELEGRAM_BOT_TOKEN;
        this.apiBaseUrl = `https://api.telegram.org/bot${this.botToken}`;
        this.client = axios.create({
            timeout: 10000,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    /**
     * 发送Telegram消息
     * @param {string} chatId - Telegram Chat ID
     * @param {string} text - 消息内容
     * @param {Object} options - 发送选项
     * @returns {Promise<Object>} 发送结果
     */
    async sendMessage(chatId, text, options = {}) {
        try {
            if (!this.botToken) {
                throw new Error('Telegram Bot Token not configured');
            }

            if (!chatId) {
                throw new Error('Chat ID is required');
            }

            const response = await this.client.post(`${this.apiBaseUrl}/sendMessage`, {
                chat_id: chatId,
                text: text,
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                ...options
            });

            return {
                success: true,
                messageId: response.data.result.message_id,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Telegram notification failed:', error);
            return {
                success: false,
                error: error.response?.data?.description || error.message
            };
        }
    }

    /**
     * 验证Chat ID是否有效
     * @param {string} chatId - Telegram Chat ID
     * @returns {Promise<Object>} 验证结果
     */
    async validateChatId(chatId) {
        try {
            if (!this.botToken) {
                return { success: false, error: 'Telegram Bot Token not configured' };
            }

            const response = await this.client.get(`${this.apiBaseUrl}/getChat`, {
                params: { chat_id: chatId }
            });
            return { success: true, chatInfo: response.data.result };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.description || error.message || 'Invalid Chat ID'
            };
        }
    }

    /**
     * 获取Bot信息
     * @returns {Promise<Object>} Bot信息
     */
    async getBotInfo() {
        try {
            if (!this.botToken) {
                return { success: false, error: 'Telegram Bot Token not configured' };
            }

            const response = await this.client.get(`${this.apiBaseUrl}/getMe`);
            return { success: true, botInfo: response.data.result };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.description || error.message || 'Failed to get bot info'
            };
        }
    }

    /**
     * 设置Webhook
     * @param {string} webhookUrl - Webhook URL
     * @returns {Promise<Object>} 设置结果
     */
    async setWebhook(webhookUrl) {
        try {
            if (!this.botToken) {
                throw new Error('Telegram Bot Token not configured');
            }

            const response = await this.client.post(`${this.apiBaseUrl}/setWebhook`, {
                url: webhookUrl
            });
            return { success: true, result: response.data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * 删除Webhook
     * @returns {Promise<Object>} 删除结果
     */
    async deleteWebhook() {
        try {
            if (!this.botToken) {
                throw new Error('Telegram Bot Token not configured');
            }

            const response = await this.client.post(`${this.apiBaseUrl}/deleteWebhook`);
            return { success: true, result: response.data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * 获取Webhook信息
     * @returns {Promise<Object>} Webhook信息
     */
    async getWebhookInfo() {
        try {
            if (!this.botToken) {
                throw new Error('Telegram Bot Token not configured');
            }

            const response = await this.client.get(`${this.apiBaseUrl}/getWebhookInfo`);
            return { success: true, webhookInfo: response.data.result };
        } catch (error) {
            return { success: false, error: error.response?.data?.description };
        }
    }

    /**
     * 获取更新消息
     * @param {number} offset - 偏移量
     * @param {number} limit - 限制数量
     * @returns {Promise<Object>} 更新消息
     */
    async getUpdates(offset = 0, limit = 100) {
        try {
            if (!this.botToken) {
                throw new Error('Telegram Bot Token not configured');
            }

            const response = await this.client.get(`${this.apiBaseUrl}/getUpdates`, {
                params: { offset, limit }
            });
            return { success: true, updates: response.data.result };
        } catch (error) {
            return { success: false, error: error.response?.data?.description };
        }
    }

    /**
     * 发送测试消息
     * @param {string} chatId - Telegram Chat ID
     * @returns {Promise<Object>} 发送结果
     */
    async sendTestMessage(chatId) {
        const testMessage = `🔔 <b>订阅管理系统测试消息</b>

这是一条来自订阅管理系统的测试消息。

如果您收到此消息，说明您的Telegram通知配置正确！

⏰ 发送时间: ${new Date().toLocaleString('zh-CN')}

如有问题，请联系管理员。`;

        return await this.sendMessage(chatId, testMessage);
    }

    /**
     * 检查Bot Token是否配置
     * @returns {boolean} 是否配置
     */
    isConfigured() {
        return !!this.botToken && this.botToken !== 'your_telegram_bot_token_here';
    }

    /**
     * 获取配置状态
     * @returns {Object} 配置状态
     */
    getConfigStatus() {
        return {
            configured: this.isConfigured(),
            hasToken: !!this.botToken,
            isPlaceholder: this.botToken === 'your_telegram_bot_token_here' || !this.botToken
        };
    }
}

module.exports = TelegramService;