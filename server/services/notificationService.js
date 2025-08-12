const TelegramService = require('./telegramService');
const { createDatabaseConnection } = require('../config/database');
const UserPreferenceService = require('./userPreferenceService');
const { getTemplate, getSupportedLanguages } = require('../config/notificationTemplates');
const {
  SUPPORTED_NOTIFICATION_TYPES,
  SUPPORTED_CHANNELS,
  DEFAULT_NOTIFICATION_CHANNELS
} = require('../config/notification');

class NotificationService {
    constructor(db = null) {
        this.db = db || createDatabaseConnection();
        this.telegramService = new TelegramService();
        this.userPreferenceService = new UserPreferenceService(this.db);
    }

    /**
     * 发送通知
     * @param {Object} notificationData - 通知数据
     * @param {number} notificationData.subscriptionId - 订阅ID
     * @param {string} notificationData.notificationType - 通知类型
     * @param {string[]} [notificationData.channels] - 指定的通知渠道
     * @returns {Promise<Object>} 发送结果
     */
    async sendNotification(notificationData) {
        const {
            subscriptionId,
            notificationType,
            channels = null
        } = notificationData;

        try {
            // 验证通知类型
            if (!SUPPORTED_NOTIFICATION_TYPES.includes(notificationType)) {
                return { success: false, message: 'Invalid notification type' };
            }

            // 获取通知设置
            const settings = this.getNotificationSettings(notificationType);
            if (!settings || !settings.is_enabled) {
                return { success: false, message: 'Notification type disabled' };
            }

            // 获取订阅信息
            const subscription = this.getSubscriptionById(subscriptionId);
            if (!subscription) {
                return { success: false, message: 'Subscription not found' };
            }

            // 获取配置的通知渠道
            const targetChannels = channels || this.getEnabledChannels();

            // 为每个渠道发送通知
            const results = [];
            for (const channel of targetChannels) {
                const result = await this.sendToChannel({
                    subscription,
                    notificationType,
                    channel,
                    settings
                });
                results.push(result);
            }

            return { success: true, results };
        } catch (error) {
            console.error('Notification service error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 发送到指定渠道
     * @param {Object} params - 发送参数
     * @param {Object} params.subscription - 订阅信息
     * @param {string} params.notificationType - 通知类型
     * @param {string} params.channel - 通知渠道
     * @param {Object} params.settings - 通知设置
     * @returns {Promise<Object>} 发送结果
     */
    async sendToChannel({ subscription, notificationType, channel, settings }) {
        try {
            const channelConfig = this.getChannelConfig(channel);
            if (!channelConfig || !channelConfig.is_active) {
                return { success: false, channel, message: 'Channel not configured' };
            }

            // 获取用户语言偏好（单用户系统）
            const userLanguage = this.userPreferenceService.getUserLanguage();

            // 渲染消息模板
            const messageContent = this.renderMessageTemplate({
                subscription,
                notificationType,
                channel,
                language: userLanguage
            });

            const recipient = this.getRecipient(channelConfig);
            const sendTime = new Date();

            // 发送通知
            let sendResult;
            switch (channel) {
                case 'telegram':
                    sendResult = await this.telegramService.sendMessage(
                        recipient,
                        messageContent
                    );
                    break;
                default:
                    sendResult = { success: false, error: `Unsupported channel: ${channel}` };
            }

            // 直接创建最终状态的通知记录
            const notificationRecord = this.createNotificationRecord({
                subscriptionId: subscription.id,
                notificationType,
                channelType: channel,
                recipient,
                messageContent,
                status: sendResult.success ? 'sent' : 'failed',
                sentAt: sendResult.success ? sendTime : null,
                errorMessage: sendResult.error || null
            });

            // 更新渠道最后使用时间
            this.updateChannelLastUsed(channel);

            return sendResult;
        } catch (error) {
            console.error(`Error sending to ${channel}:`, error);
            return { success: false, channel, error: error.message };
        }
    }

    /**
     * 获取通知设置
     * @param {string} notificationType - 通知类型
     * @returns {Object|null} 通知设置
     */
    getNotificationSettings(notificationType) {
        try {
            const query = `
                SELECT * FROM notification_settings
                WHERE notification_type = ?
            `;
            const result = this.db.prepare(query).get(notificationType);
            return result;
        } catch (error) {
            console.error('Error getting notification settings:', error);
            return null;
        }
    }

    /**
     * 获取订阅信息
     * @param {number} subscriptionId - 订阅ID
     * @returns {Object|null} 订阅信息
     */
    getSubscriptionById(subscriptionId) {
        try {
            const query = `
                SELECT s.*, c.label as category_label, pm.label as payment_method_label
                FROM subscriptions s
                LEFT JOIN categories c ON s.category_id = c.id
                LEFT JOIN payment_methods pm ON s.payment_method_id = pm.id
                WHERE s.id = ?
            `;
            const result = this.db.prepare(query).get(subscriptionId);
            return result;
        } catch (error) {
            console.error('Error getting subscription:', error);
            return null;
        }
    }

    /**
     * 获取启用的通知渠道
     * @returns {Array<string>} 渠道列表
     */
    getEnabledChannels() {
        try {
            const query = `
                SELECT channel_type FROM notification_channels
                WHERE is_active = 1
            `;
            const results = this.db.prepare(query).all();

            if (results.length === 0) {
                return DEFAULT_NOTIFICATION_CHANNELS; // 使用默认渠道
            }

            return results.map(row => row.channel_type);
        } catch (error) {
            console.error('Error getting enabled channels:', error);
            return DEFAULT_NOTIFICATION_CHANNELS;
        }
    }

    /**
     * 获取渠道配置
     * @param {string} channelType - 渠道类型
     * @returns {Object|null} 渠道配置
     */
    getChannelConfig(channelType) {
        try {
            const query = `
                SELECT * FROM notification_channels
                WHERE channel_type = ?
            `;
            const result = this.db.prepare(query).get(channelType);
            if (result) {
                try {
                    result.config = JSON.parse(result.channel_config);
                } catch (parseError) {
                    console.error('Error parsing channel config JSON:', parseError);
                    result.config = {};
                }
            }
            return result;
        } catch (error) {
            console.error('Error getting channel config:', error);
            return null;
        }
    }

    /**
     * 渲染消息模板
     * @param {Object} params - 模板参数
     * @returns {string} 渲染后的消息
     */
    renderMessageTemplate({ subscription, notificationType, channel, language = 'zh-CN' }) {
        try {
            // 获取模板
            const template = this.getTemplate(notificationType, language, channel);
            if (!template) {
                return this.getDefaultMessage(subscription, notificationType);
            }

            // 准备模板数据
            const templateData = {
                name: subscription.name,
                plan: subscription.plan,
                amount: subscription.amount,
                currency: subscription.currency,
                next_billing_date: this.formatDate(subscription.next_billing_date, language),
                payment_method: subscription.payment_method_label || subscription.payment_method_id,
                status: subscription.status,
                billing_cycle: subscription.billing_cycle
            };

            // 简单的模板替换
            let content = template.content_template;
            Object.keys(templateData).forEach(key => {
                const regex = new RegExp(`{{${key}}}`, 'g');
                content = content.replace(regex, templateData[key]);
            });

            return content;
        } catch (error) {
            console.error('Error rendering template:', error);
            return this.getDefaultMessage(subscription, notificationType);
        }
    }

    /**
     * 获取模板（支持语言回退）
     * @param {string} notificationType - 通知类型
     * @param {string} language - 语言
     * @param {string} channel - 渠道
     * @returns {Object|null} 模板
     */
    getTemplate(notificationType, language, channel) {
        try {
            // 使用配置文件中的模板
            return getTemplate(notificationType, language, channel);
        } catch (error) {
            console.error('Error getting template:', error);
            return null;
        }
    }

    /**
     * 获取默认消息
     * @param {Object} subscription - 订阅信息
     * @param {string} notificationType - 通知类型
     * @returns {string} 默认消息
     */
    getDefaultMessage(subscription, notificationType) {
        const typeMessages = {
            renewal_reminder: `续订提醒: ${subscription.name} 将在 ${this.formatDate(subscription.next_billing_date)} 到期，金额: ${subscription.amount} ${subscription.currency}`,
            expiration_warning: `过期警告: ${subscription.name} 已在 ${this.formatDate(subscription.next_billing_date)} 过期`,
            renewal_success: `续订成功: ${subscription.name} 续订成功，金额: ${subscription.amount} ${subscription.currency}`,
            renewal_failure: `续订失败: ${subscription.name} 续订失败，金额: ${subscription.amount} ${subscription.currency}`,
            subscription_change: `订阅变更: ${subscription.name} 信息已更新`
        };

        return typeMessages[notificationType] || `订阅通知: ${subscription.name}`;
    }

    /**
     * 创建通知记录
     * @param {Object} data - 通知数据
     * @param {number} data.subscriptionId - 订阅ID
     * @param {string} data.notificationType - 通知类型
     * @param {string} data.channelType - 渠道类型
     * @param {string} data.recipient - 接收者
     * @param {string} data.messageContent - 消息内容
     * @param {string} data.status - 状态 ('sent' 或 'failed')
     * @param {Date} [data.sentAt] - 发送时间
     * @param {string} [data.errorMessage] - 错误信息
     * @returns {Object} 创建的记录
     */
    createNotificationRecord(data) {
        try {
            const query = `
                INSERT INTO notification_history
                (subscription_id, notification_type, channel_type, status, recipient, message_content, sent_at, error_message)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const result = this.db.prepare(query).run(
                data.subscriptionId,
                data.notificationType,
                data.channelType,
                data.status, // 'sent' or 'failed'
                data.recipient,
                data.messageContent,
                data.sentAt ? data.sentAt.toISOString() : null,
                data.errorMessage || null
            );
            return { id: result.lastInsertRowid, ...data };
        } catch (error) {
            console.error('Error creating notification record:', error);
            throw error;
        }
    }



    /**
     * 更新渠道最后使用时间
     * @param {string} channelType - 渠道类型
     */
    updateChannelLastUsed(channelType) {
        try {
            const query = `
                UPDATE notification_channels
                SET last_used_at = CURRENT_TIMESTAMP
                WHERE channel_type = ?
            `;
            this.db.prepare(query).run(channelType);
        } catch (error) {
            console.error('Error updating channel last used time:', error);
        }
    }

    /**
     * 获取接收者信息
     * @param {Object} channelConfig - 渠道配置
     * @returns {string} 接收者信息
     */
    getRecipient(channelConfig) {
        if (channelConfig.config && channelConfig.config.chat_id) {
            return channelConfig.config.chat_id;
        }
        return channelConfig.channel_config; // 兼容旧格式
    }

    /**
     * 格式化日期
     * @param {string} dateString - 日期字符串
     * @returns {string} 格式化后的日期
     */
    formatDate(dateString, language = 'zh-CN') {
        try {
            if (!dateString) {
                const locale = language || 'zh-CN';
                return locale.startsWith('en') ? 'Unknown date' : '未知日期';
            }

            const date = new Date(dateString);
            const locale = language || 'zh-CN';
            return date.toLocaleDateString(locale);
        } catch (error) {
            return dateString;
        }
    }

    /**
     * 配置通知渠道
     * @param {string} channelType - 渠道类型
     * @param {Object} config - 配置信息
     * @returns {Object} 配置结果
     */
    async configureChannel(channelType, config) {
        try {
            const configJson = JSON.stringify(config);

            // 检查是否已存在（不限制 is_active 状态）
            const existingQuery = `
                SELECT * FROM notification_channels
                WHERE channel_type = ?
            `;
            const existing = this.db.prepare(existingQuery).get(channelType);

            if (existing) {
                // 更新现有配置
                const query = `
                    UPDATE notification_channels
                    SET channel_config = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP
                    WHERE channel_type = ?
                `;
                this.db.prepare(query).run(configJson, channelType);
            } else {
                // 创建新配置
                const query = `
                    INSERT INTO notification_channels (channel_type, channel_config, is_active)
                    VALUES (?, ?, 1)
                `;
                this.db.prepare(query).run(channelType, configJson);
            }

            return { success: true, message: 'Channel configured successfully' };
        } catch (error) {
            console.error('Error configuring channel:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 测试通知
     * @param {string} channelType - 渠道类型
     * @returns {Promise<Object>} 测试结果
     */
    async testNotification(channelType) {
        try {
            const channelConfig = this.getChannelConfig(channelType);
            if (!channelConfig) {
                return { success: false, message: 'Channel not configured' };
            }

            if (channelType === 'telegram') {
                const chatId = this.getRecipient(channelConfig);
                return await this.telegramService.sendTestMessage(chatId);
            }

            return { success: false, message: 'Unsupported channel type' };
        } catch (error) {
            console.error('Error testing notification:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 获取通知历史
     * @param {Object} options - 查询选项
     * @returns {Object} 包含数据和总数的对象
     */
    getNotificationHistory(options = {}) {
        try {
            const { page = 1, limit = 20, status, type } = options;
            const offset = (page - 1) * limit;

            // Build base query
            let baseQuery = `
                FROM notification_history nh
                LEFT JOIN subscriptions s ON nh.subscription_id = s.id
                WHERE 1=1
            `;

            const params = [];
            const countParams = [];
            
            if (status) {
                baseQuery += ' AND nh.status = ?';
                params.push(status);
                countParams.push(status);
            }
            
            if (type) {
                baseQuery += ' AND nh.notification_type = ?';
                params.push(type);
                countParams.push(type);
            }

            // Get total count
            const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
            const countResult = this.db.prepare(countQuery).get(...countParams);
            const total = countResult.total;

            // Get paginated data
            const dataQuery = `
                SELECT nh.*, s.name as subscription_name
                ${baseQuery}
                ORDER BY nh.created_at DESC LIMIT ? OFFSET ?
            `;
            params.push(limit, offset);
            const data = this.db.prepare(dataQuery).all(...params);

            return {
                data,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            };
        } catch (error) {
            console.error('Error getting notification history:', error);
            return {
                data: [],
                total: 0,
                page: 1,
                limit: 20,
                totalPages: 0
            };
        }
    }

    /**
     * 关闭数据库连接
     */
    close() {
        if (this.db) {
            this.db.close();
        }
    }
}

module.exports = NotificationService;