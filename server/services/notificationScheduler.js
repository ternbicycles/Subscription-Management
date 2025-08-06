const cron = require('node-cron');
const NotificationService = require('./notificationService');
const { createDatabaseConnection } = require('../config/database');

class NotificationScheduler {
    constructor() {
        this.db = createDatabaseConnection();
        this.notificationService = new NotificationService();
        this.job = null;
    }

    /**
     * 启动通知调度器
     */
    start() {
        // 每天早上9点检查并发送通知
        this.job = cron.schedule('0 9 * * *', async () => {
            console.log('🔔 Starting notification check...');
            await this.checkAndSendNotifications();
        }, {
            scheduled: false,
            timezone: 'Asia/Shanghai'
        });

        this.job.start();
        console.log('✅ Notification scheduler started');
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
            // Since subscriptions table doesn't have user_id, we use a cross join approach
            // assuming all subscriptions belong to user_id = 1 (single user system)
            // Find subscriptions that will expire within the advance_days period (1 to advance_days from now)
            const query = `
                SELECT s.*, ns.advance_days, ns.notification_channels, 'renewal_reminder' as notification_type
                FROM subscriptions s
                CROSS JOIN notification_settings ns 
                WHERE ns.user_id = 1
                    AND ns.notification_type = 'renewal_reminder'
                    AND ns.is_enabled = 1
                    AND s.status = 'active'
                    AND s.next_billing_date BETWEEN date('now', '+1 day') AND date('now', '+' || ns.advance_days || ' days')
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
            // Since subscriptions table doesn't have user_id, we use a cross join approach
            // assuming all subscriptions belong to user_id = 1 (single user system)
            // Find subscriptions that have already expired (past next_billing_date)
            const query = `
                SELECT s.*, ns.advance_days, ns.notification_channels, 'expiration_warning' as notification_type
                FROM subscriptions s
                CROSS JOIN notification_settings ns 
                WHERE ns.user_id = 1
                    AND ns.notification_type = 'expiration_warning'
                    AND ns.is_enabled = 1
                    AND s.status = 'active'
                    AND s.next_billing_date < date('now')
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
                userId: 1, // Default user ID since subscriptions don't have user_id field
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