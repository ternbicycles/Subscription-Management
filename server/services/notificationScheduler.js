const cron = require('node-cron');
const NotificationService = require('./notificationService');
const { createDatabaseConnection } = require('../config/database');

class NotificationScheduler {
    constructor() {
        this.db = createDatabaseConnection();
        this.notificationService = new NotificationService(this.db);
        this.job = null;
        this.currentSchedule = null;
    }

    /**
     * 启动通知调度器
     */
    start() {
        this.updateSchedule();
        console.log('✅ Notification scheduler started');
    }

    /**
     * 更新调度器设置
     */
    updateSchedule() {
        try {
            // 获取当前的调度器设置
            const settings = this.getSchedulerSettings();

            // 如果已有任务在运行且设置相同，则不需要更新
            if (this.currentSchedule &&
                this.currentSchedule.time === settings.notification_check_time &&
                this.currentSchedule.timezone === settings.timezone &&
                this.currentSchedule.enabled === settings.is_enabled) {
                return;
            }

            // 停止现有任务
            if (this.job) {
                this.job.stop();
                this.job = null;
            }

            // 如果调度器被禁用，则不启动新任务
            if (!settings.is_enabled) {
                console.log('⏸️ Notification scheduler is disabled');
                this.currentSchedule = null;
                return;
            }

            // 解析时间设置 (HH:MM 格式)
            const [hour, minute] = settings.notification_check_time.split(':');
            const cronExpression = `${minute} ${hour} * * *`;

            // 创建新的定时任务
            this.job = cron.schedule(cronExpression, async () => {
                console.log(`🔔 Starting notification check at ${settings.notification_check_time}...`);
                await this.checkAndSendNotifications();
            }, {
                scheduled: false,
                timezone: settings.timezone
            });

            this.job.start();

            // 记录当前设置
            this.currentSchedule = {
                time: settings.notification_check_time,
                timezone: settings.timezone,
                enabled: settings.is_enabled
            };

            console.log(`✅ Notification scheduler updated: ${settings.notification_check_time} (${settings.timezone})`);
        } catch (error) {
            console.error('Error updating notification schedule:', error);
        }
    }

    /**
     * 获取调度器设置
     */
    getSchedulerSettings() {
        try {
            const query = `
                SELECT notification_check_time, timezone, is_enabled
                FROM scheduler_settings
                WHERE id = 1
            `;
            const result = this.db.prepare(query).get();

            // 如果没有设置，返回默认值
            if (!result) {
                return {
                    notification_check_time: '09:00',
                    timezone: 'Asia/Shanghai',
                    is_enabled: true
                };
            }

            return result;
        } catch (error) {
            console.error('Error getting scheduler settings:', error);
            // 返回默认设置
            return {
                notification_check_time: '09:00',
                timezone: 'Asia/Shanghai',
                is_enabled: true
            };
        }
    }

    /**
     * 停止通知调度器
     */
    stop() {
        if (this.job) {
            this.job.stop();
            this.job = null;
            console.log('⏹️ Notification scheduler stopped');
        }
    }

    /**
     * 检查并发送通知
     */
    async checkAndSendNotifications() {
        try {
            console.log('🔍 Checking for notifications to send...');

            // 检查续订提醒
            const renewalNotifications = await this.getRenewalNotifications();
            console.log(`📅 Found ${renewalNotifications.length} renewal reminders`);
            
            for (const notification of renewalNotifications) {
                await this.sendNotification(notification);
            }

            // 检查过期警告
            const expirationNotifications = await this.getExpirationNotifications();
            console.log(`⚠️ Found ${expirationNotifications.length} expiration warnings`);
            
            for (const notification of expirationNotifications) {
                await this.sendNotification(notification);
            }

            console.log(`✅ Processed ${renewalNotifications.length + expirationNotifications.length} notifications`);
        } catch (error) {
            console.error('❌ Notification check failed:', error);
        }
    }

    /**
     * 获取需要发送续订提醒的订阅
     */
    async getRenewalNotifications() {
        try {
            // Find subscriptions that will expire within the advance_days period (1 to advance_days from now)
            let query = `
                SELECT s.*, ns.advance_days, ns.notification_channels, ns.repeat_notification, 'renewal_reminder' as notification_type
                FROM subscriptions s
                CROSS JOIN notification_settings ns
                WHERE ns.notification_type = 'renewal_reminder'
                    AND ns.is_enabled = 1
                    AND s.status = 'active'
                    AND s.next_billing_date BETWEEN date('now', '+1 day') AND date('now', '+' || ns.advance_days || ' days')
            `;

            // If repeat_notification is disabled, add check to prevent duplicate notifications
            query += `
                AND (ns.repeat_notification = 1 OR NOT EXISTS (
                    SELECT 1 FROM notification_history nh
                    WHERE nh.subscription_id = s.id
                    AND nh.notification_type = 'renewal_reminder'
                    AND nh.status = 'sent'
                    AND date(nh.created_at) >= date('now', '-' || ns.advance_days || ' days')
                ))
            `;

            return this.db.prepare(query).all();
        } catch (error) {
            console.error('Error getting renewal notifications:', error);
            return [];
        }
    }

    /**
     * 获取需要发送过期警告的订阅
     */
    async getExpirationNotifications() {
        try {
            // Find subscriptions that expired exactly yesterday (next_billing_date = yesterday)
            // This ensures we only send expiration warning once, on the first day after expiration
            const query = `
                SELECT s.*, ns.notification_channels, 'expiration_warning' as notification_type
                FROM subscriptions s
                CROSS JOIN notification_settings ns
                WHERE ns.notification_type = 'expiration_warning'
                    AND ns.is_enabled = 1
                    AND s.status = 'active'
                    AND s.next_billing_date = date('now', '-1 day')
                    AND NOT EXISTS (
                        SELECT 1 FROM notification_history nh
                        WHERE nh.subscription_id = s.id
                        AND nh.notification_type = 'expiration_warning'
                        AND nh.status = 'sent'
                        AND date(nh.created_at) = date('now')
                    )
            `;

            return this.db.prepare(query).all();
        } catch (error) {
            console.error('Error getting expiration notifications:', error);
            return [];
        }
    }

    /**
     * 发送通知
     */
    async sendNotification(subscription) {
        try {
            const result = await this.notificationService.sendNotification({
                subscriptionId: subscription.id,
                notificationType: subscription.notification_type,
                channels: JSON.parse(subscription.notification_channels || '["telegram"]')
            });

            if (result.success) {
                console.log(`✅ Notification sent for subscription: ${subscription.name} (${subscription.notification_type})`);
            } else {
                console.error(`❌ Failed to send notification for subscription: ${subscription.name}`, result.error);
            }
        } catch (error) {
            console.error(`❌ Error sending notification for subscription: ${subscription.name}`, error);
        }
    }

    /**
     * 手动触发通知检查
     */
    async triggerCheck() {
        console.log('🔔 Manually triggering notification check...');
        await this.checkAndSendNotifications();
    }

    /**
     * 更新调度器设置
     */
    updateSchedulerSettings(settings) {
        try {
            const query = `
                UPDATE scheduler_settings
                SET notification_check_time = ?, timezone = ?, is_enabled = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = 1
            `;

            const result = this.db.prepare(query).run(
                settings.notification_check_time,
                settings.timezone,
                settings.is_enabled ? 1 : 0
            );

            if (result.changes === 0) {
                // 如果没有更新任何行，说明记录不存在，需要插入
                const insertQuery = `
                    INSERT INTO scheduler_settings (id, notification_check_time, timezone, is_enabled)
                    VALUES (1, ?, ?, ?)
                `;
                this.db.prepare(insertQuery).run(
                    settings.notification_check_time,
                    settings.timezone,
                    settings.is_enabled ? 1 : 0
                );
            }

            // 更新调度器
            this.updateSchedule();

            return { success: true };
        } catch (error) {
            console.error('Error updating scheduler settings:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 获取调度器状态
     */
    getStatus() {
        return {
            running: this.job !== null,
            nextRun: this.job ? this.job.running : false
        };
    }

    /**
     * 关闭数据库连接
     */
    close() {
        if (this.db) {
            this.db.close();
        }
        if (this.notificationService) {
            this.notificationService.close();
        }
    }
}

module.exports = NotificationScheduler;