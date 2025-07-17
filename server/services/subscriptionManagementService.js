const BaseRepository = require('../utils/BaseRepository');
const { calculateNextBillingDate, getTodayString, isDateDueOrOverdue } = require('../utils/dateUtils');
const logger = require('../utils/logger');

/**
 * 订阅管理服务类
 * 处理订阅续费、过期处理等业务逻辑
 */
class SubscriptionManagementService extends BaseRepository {
    constructor(db) {
        super(db, 'subscriptions');
    }

    /**
     * 处理自动续费
     * @returns {Object} 处理结果
     */
    async processAutoRenewals() {
        try {
            // 获取所有活跃的自动续费订阅
            const activeAutoRenewalSubscriptions = this.findAll({
                filters: { status: 'active', renewal_type: 'auto' }
            });

            let processed = 0;
            let errors = 0;
            const renewedSubscriptions = [];

            // 检查每个订阅是否需要续费
            for (const subscription of activeAutoRenewalSubscriptions) {
                try {
                    if (isDateDueOrOverdue(subscription.next_billing_date)) {
                        const renewalResult = await this._renewSubscription(subscription, 'auto');
                        if (renewalResult.success) {
                            processed++;
                            renewedSubscriptions.push(renewalResult.data);
                        } else {
                            errors++;
                        }
                    }
                } catch (error) {
                    logger.error(`Error processing renewal for subscription ${subscription.id}:`, error.message);
                    errors++;
                }
            }

            const result = {
                message: `Auto renewal complete: ${processed} processed, ${errors} errors`,
                processed,
                errors,
                renewedSubscriptions
            };

            logger.info(result.message);
            return result;
        } catch (error) {
            logger.error('Failed to process auto renewals:', error.message);
            throw error;
        }
    }

    /**
     * 处理过期的手动续费订阅
     * @returns {Object} 处理结果
     */
    async processExpiredSubscriptions() {
        try {
            // 获取所有活跃的手动续费订阅
            const activeManualSubscriptions = this.findAll({
                filters: { status: 'active', renewal_type: 'manual' }
            });

            let processed = 0;
            let errors = 0;
            const expiredSubscriptions = [];

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // 检查每个手动订阅是否过期
            for (const subscription of activeManualSubscriptions) {
                try {
                    const billingDate = new Date(subscription.next_billing_date);
                    billingDate.setHours(0, 0, 0, 0);

                    // 如果计费日期已过，标记为取消
                    if (billingDate < today) {
                        const result = this.update(subscription.id, {
                            status: 'cancelled',
                            updated_at: new Date().toISOString()
                        });

                        if (result.changes > 0) {
                            processed++;
                            expiredSubscriptions.push({
                                id: subscription.id,
                                name: subscription.name,
                                expiredDate: subscription.next_billing_date
                            });
                        } else {
                            errors++;
                        }
                    }
                } catch (error) {
                    logger.error(`Error processing expiration for subscription ${subscription.id}:`, error.message);
                    errors++;
                }
            }

            const result = {
                message: `Expired subscriptions processed: ${processed} expired, ${errors} errors`,
                processed,
                errors,
                expiredSubscriptions
            };

            logger.info(result.message);
            return result;
        } catch (error) {
            logger.error('Failed to process expired subscriptions:', error.message);
            throw error;
        }
    }

    /**
     * 手动续费订阅
     * @param {number} subscriptionId - 订阅ID
     * @returns {Object} 续费结果
     */
    async manualRenewSubscription(subscriptionId) {
        try {
            // 获取订阅信息
            const subscription = this.findById(subscriptionId);
            if (!subscription) {
                throw new Error('Subscription not found');
            }

            if (subscription.renewal_type !== 'manual') {
                throw new Error('Only manual renewal subscriptions can be manually renewed');
            }

            const renewalResult = await this._renewSubscription(subscription, 'manual');
            
            if (renewalResult.success) {
                logger.info(`Manual renewal completed for subscription ${subscriptionId}`);
                return {
                    message: 'Subscription renewed successfully',
                    renewalData: renewalResult.data
                };
            } else {
                throw new Error('Failed to update subscription');
            }
        } catch (error) {
            logger.error(`Failed to manually renew subscription ${subscriptionId}:`, error.message);
            throw error;
        }
    }

    /**
     * 重新激活已取消的订阅
     * @param {number} subscriptionId - 订阅ID
     * @returns {Object} 重新激活结果
     */
    async reactivateSubscription(subscriptionId) {
        try {
            // 获取订阅信息
            const subscription = this.findById(subscriptionId);
            if (!subscription) {
                throw new Error('Subscription not found');
            }

            if (subscription.status !== 'cancelled') {
                throw new Error('Only cancelled subscriptions can be reactivated');
            }

            const todayStr = getTodayString();
            const newNextBillingStr = calculateNextBillingDate(todayStr, subscription.billing_cycle);

            // 使用事务确保数据一致性
            const reactivationResult = this.transaction(() => {
                // 更新订阅状态
                const updateResult = this.update(subscriptionId, {
                    last_billing_date: todayStr,
                    next_billing_date: newNextBillingStr,
                    status: 'active',
                    updated_at: new Date().toISOString()
                });

                if (updateResult.changes > 0) {
                    // 创建支付历史记录
                    this._createPaymentRecord(subscription, {
                        payment_date: todayStr,
                        billing_period_start: todayStr,
                        billing_period_end: newNextBillingStr,
                        notes: 'Subscription reactivation payment'
                    });
                    return true;
                }
                return false;
            });

            if (reactivationResult) {
                const result = {
                    message: 'Subscription reactivated successfully',
                    reactivationData: {
                        id: subscription.id,
                        name: subscription.name,
                        newLastBilling: todayStr,
                        newNextBilling: newNextBillingStr,
                        status: 'active'
                    }
                };

                logger.info(`Subscription ${subscriptionId} reactivated successfully`);
                return result;
            } else {
                throw new Error('Failed to reactivate subscription');
            }
        } catch (error) {
            logger.error(`Failed to reactivate subscription ${subscriptionId}:`, error.message);
            throw error;
        }
    }

    /**
     * 重置所有订阅数据
     * @returns {Object} 重置结果
     */
    async resetAllSubscriptions() {
        try {
            // 使用事务确保数据一致性
            const resetResult = this.transaction(() => {
                // 显式删除 payment_history 表（确保清理）
                const paymentHistoryResult = this.db.prepare('DELETE FROM payment_history').run();

                // 删除所有订阅
                const subscriptionResult = this.db.prepare('DELETE FROM subscriptions').run();

                // 显式清理 monthly_expenses 表
                const monthlyExpensesResult = this.db.prepare('DELETE FROM monthly_expenses').run();

                return {
                    subscriptions: subscriptionResult.changes,
                    paymentHistory: paymentHistoryResult.changes,
                    monthlyExpenses: monthlyExpensesResult.changes
                };
            });

            const result = {
                message: 'All subscriptions and related data have been deleted.',
                deletedCounts: resetResult
            };

            logger.info(`Reset completed: ${resetResult.subscriptions} subscriptions, ${resetResult.monthlyExpenses} monthly expense records deleted`);
            return result;
        } catch (error) {
            logger.error('Failed to reset subscriptions:', error.message);
            throw error;
        }
    }

    /**
     * 续费订阅（内部方法）
     * @private
     * @param {Object} subscription - 订阅对象
     * @param {string} renewalType - 续费类型 ('auto' | 'manual')
     * @returns {Object} 续费结果
     */
    async _renewSubscription(subscription, renewalType) {
        const todayStr = getTodayString();
        
        // 计算新的下次计费日期
        let baseDate;
        if (renewalType === 'manual') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const currentNextBilling = new Date(subscription.next_billing_date);
            currentNextBilling.setHours(0, 0, 0, 0);
            
            // 如果在到期日之前续费，从原到期日计算；如果在到期日之后续费，从今天计算
            baseDate = currentNextBilling >= today ? subscription.next_billing_date : todayStr;
        } else {
            baseDate = subscription.next_billing_date;
        }
        
        const newNextBillingStr = calculateNextBillingDate(baseDate, subscription.billing_cycle);

        try {
            // 使用事务确保数据一致性
            const renewalResult = this.transaction(() => {
                // 更新订阅
                const updateResult = this.update(subscription.id, {
                    last_billing_date: todayStr,
                    next_billing_date: newNextBillingStr,
                    status: 'active', // 确保状态为活跃
                    updated_at: new Date().toISOString()
                });

                if (updateResult.changes > 0) {
                    // 创建支付历史记录
                    this._createPaymentRecord(subscription, {
                        payment_date: todayStr,
                        billing_period_start: subscription.next_billing_date,
                        billing_period_end: newNextBillingStr,
                        notes: `${renewalType === 'auto' ? 'Auto' : 'Manual'} renewal payment`
                    });
                    return true;
                }
                return false;
            });

            if (renewalResult) {
                return {
                    success: true,
                    data: {
                        id: subscription.id,
                        name: subscription.name,
                        oldNextBilling: subscription.next_billing_date,
                        newLastBilling: todayStr,
                        newNextBilling: newNextBillingStr,
                        renewedEarly: renewalType === 'manual' && new Date(subscription.next_billing_date) >= new Date()
                    }
                };
            } else {
                return { success: false };
            }
        } catch (error) {
            logger.error(`Failed to renew subscription ${subscription.id}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 创建支付记录（内部方法）
     * @private
     * @param {Object} subscription - 订阅对象
     * @param {Object} paymentData - 支付数据
     */
    _createPaymentRecord(subscription, paymentData) {
        const paymentStmt = this.db.prepare(`
            INSERT INTO payment_history (subscription_id, payment_date, amount_paid, currency, billing_period_start, billing_period_end, status, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        paymentStmt.run(
            subscription.id,
            paymentData.payment_date,
            subscription.amount,
            subscription.currency,
            paymentData.billing_period_start,
            paymentData.billing_period_end,
            'succeeded',
            paymentData.notes
        );
    }
}

module.exports = SubscriptionManagementService;
