const SubscriptionManagementService = require('../services/subscriptionManagementService');
const { asyncHandler } = require('../middleware/errorHandler');
const { handleQueryResult, success, validationError } = require('../utils/responseHelper');
const { createValidator } = require('../utils/validator');

/**
 * 订阅管理控制器
 * 处理订阅续费、过期处理等HTTP请求
 */
class SubscriptionManagementController {
    constructor(db) {
        this.subscriptionManagementService = new SubscriptionManagementService(db);
    }

    /**
     * 处理自动续费
     */
    processAutoRenewals = asyncHandler(async (req, res) => {
        const result = await this.subscriptionManagementService.processAutoRenewals();
        success(res, result, result.message);
    });

    /**
     * 处理过期的手动续费订阅
     */
    processExpiredSubscriptions = asyncHandler(async (req, res) => {
        const result = await this.subscriptionManagementService.processExpiredSubscriptions();
        success(res, result, result.message);
    });

    /**
     * 手动续费订阅
     */
    manualRenewSubscription = asyncHandler(async (req, res) => {
        const { id } = req.params;

        // 验证订阅ID
        const validator = createValidator();
        validator
            .required(id, 'id')
            .integer(id, 'id')
            .range(id, 'id', 1, Infinity);

        if (validator.hasErrors()) {
            return validationError(res, validator.getErrors());
        }

        const result = await this.subscriptionManagementService.manualRenewSubscription(parseInt(id));
        success(res, result, result.message);
    });

    /**
     * 重新激活已取消的订阅
     */
    reactivateSubscription = asyncHandler(async (req, res) => {
        const { id } = req.params;

        // 验证订阅ID
        const validator = createValidator();
        validator
            .required(id, 'id')
            .integer(id, 'id')
            .range(id, 'id', 1, Infinity);

        if (validator.hasErrors()) {
            return validationError(res, validator.getErrors());
        }

        const result = await this.subscriptionManagementService.reactivateSubscription(parseInt(id));
        success(res, result, result.message);
    });

    /**
     * 重置所有订阅数据
     */
    resetAllSubscriptions = asyncHandler(async (req, res) => {
        // 可选：添加确认参数以防止意外删除
        const { confirm } = req.body;

        if (confirm !== 'DELETE_ALL_SUBSCRIPTIONS') {
            return validationError(res, 'To confirm deletion, include "confirm": "DELETE_ALL_SUBSCRIPTIONS" in request body');
        }

        const result = await this.subscriptionManagementService.resetAllSubscriptions();
        success(res, result, result.message);
    });

    /**
     * 批量处理订阅管理任务
     */
    batchProcessSubscriptions = asyncHandler(async (req, res) => {
        const { 
            processAutoRenewals = false, 
            processExpired = false,
            dryRun = false 
        } = req.body;

        // 验证参数
        const validator = createValidator();
        validator
            .boolean(processAutoRenewals, 'processAutoRenewals')
            .boolean(processExpired, 'processExpired')
            .boolean(dryRun, 'dryRun');

        if (validator.hasErrors()) {
            return validationError(res, validator.getErrors());
        }

        if (!processAutoRenewals && !processExpired) {
            return validationError(res, 'At least one of processAutoRenewals or processExpired must be true');
        }

        const results = {
            dryRun,
            autoRenewals: null,
            expiredSubscriptions: null,
            summary: {
                totalProcessed: 0,
                totalErrors: 0
            }
        };

        // 如果是试运行，只返回将要处理的数据统计
        if (dryRun) {
            // 获取将要处理的订阅统计
            if (processAutoRenewals) {
                // 这里可以添加获取待续费订阅数量的逻辑
                results.autoRenewals = { willProcess: 'Use actual service to get count' };
            }

            if (processExpired) {
                // 这里可以添加获取过期订阅数量的逻辑
                results.expiredSubscriptions = { willProcess: 'Use actual service to get count' };
            }

            return success(res, results, 'Dry run completed - no actual changes made');
        }

        // 实际处理
        if (processAutoRenewals) {
            results.autoRenewals = await this.subscriptionManagementService.processAutoRenewals();
            results.summary.totalProcessed += results.autoRenewals.processed;
            results.summary.totalErrors += results.autoRenewals.errors;
        }

        if (processExpired) {
            results.expiredSubscriptions = await this.subscriptionManagementService.processExpiredSubscriptions();
            results.summary.totalProcessed += results.expiredSubscriptions.processed;
            results.summary.totalErrors += results.expiredSubscriptions.errors;
        }

        success(res, results, `Batch processing completed: ${results.summary.totalProcessed} processed, ${results.summary.totalErrors} errors`);
    });

    /**
     * 获取订阅管理统计信息
     */
    getSubscriptionManagementStats = asyncHandler(async (req, res) => {
        // 获取各种状态的订阅统计
        const activeAutoRenewal = this.subscriptionManagementService.count({
            status: 'active',
            renewal_type: 'auto'
        });

        const activeManualRenewal = this.subscriptionManagementService.count({
            status: 'active',
            renewal_type: 'manual'
        });

        const cancelledSubscriptions = this.subscriptionManagementService.count({
            status: 'cancelled'
        });

        const inactiveSubscriptions = this.subscriptionManagementService.count({
            status: 'inactive'
        });

        // 获取即将到期的订阅（未来7天内）
        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        const todayStr = today.toISOString().split('T')[0];
        const nextWeekStr = nextWeek.toISOString().split('T')[0];

        // 这里需要使用原始SQL查询，因为BaseRepository的findAll不支持日期范围查询
        const upcomingRenewalsStmt = this.subscriptionManagementService.db.prepare(`
            SELECT COUNT(*) as count 
            FROM subscriptions 
            WHERE status = 'active' 
            AND next_billing_date BETWEEN ? AND ?
        `);
        const upcomingRenewals = upcomingRenewalsStmt.get(todayStr, nextWeekStr).count;

        // 获取过期的手动续费订阅
        const overdueStmt = this.subscriptionManagementService.db.prepare(`
            SELECT COUNT(*) as count 
            FROM subscriptions 
            WHERE status = 'active' 
            AND renewal_type = 'manual'
            AND next_billing_date < ?
        `);
        const overdueSubscriptions = overdueStmt.get(todayStr).count;

        const stats = {
            subscriptionCounts: {
                activeAutoRenewal,
                activeManualRenewal,
                cancelled: cancelledSubscriptions,
                inactive: inactiveSubscriptions,
                total: activeAutoRenewal + activeManualRenewal + cancelledSubscriptions + inactiveSubscriptions
            },
            upcomingActions: {
                upcomingRenewals,
                overdueSubscriptions
            },
            healthMetrics: {
                autoRenewalRate: activeAutoRenewal + activeManualRenewal > 0 
                    ? Math.round((activeAutoRenewal / (activeAutoRenewal + activeManualRenewal)) * 100) 
                    : 0,
                activeRate: activeAutoRenewal + activeManualRenewal + cancelledSubscriptions + inactiveSubscriptions > 0
                    ? Math.round(((activeAutoRenewal + activeManualRenewal) / (activeAutoRenewal + activeManualRenewal + cancelledSubscriptions + inactiveSubscriptions)) * 100)
                    : 0
            },
            lastUpdated: new Date().toISOString()
        };

        handleQueryResult(res, stats, 'Subscription management statistics');
    });

    /**
     * 预览即将到期的订阅
     */
    previewUpcomingRenewals = asyncHandler(async (req, res) => {
        const { days = 7 } = req.query;

        // 验证天数参数
        const validator = createValidator();
        validator
            .integer(days, 'days')
            .range(days, 'days', 1, 365);

        if (validator.hasErrors()) {
            return validationError(res, validator.getErrors());
        }

        const today = new Date();
        const futureDate = new Date(today.getTime() + parseInt(days) * 24 * 60 * 60 * 1000);
        const todayStr = today.toISOString().split('T')[0];
        const futureDateStr = futureDate.toISOString().split('T')[0];

        // 获取即将到期的订阅
        const upcomingStmt = this.subscriptionManagementService.db.prepare(`
            SELECT * FROM subscriptions 
            WHERE status = 'active' 
            AND next_billing_date BETWEEN ? AND ?
            ORDER BY next_billing_date ASC
        `);
        const upcomingSubscriptions = upcomingStmt.all(todayStr, futureDateStr);

        // 分类处理
        const autoRenewals = upcomingSubscriptions.filter(sub => sub.renewal_type === 'auto');
        const manualRenewals = upcomingSubscriptions.filter(sub => sub.renewal_type === 'manual');

        const result = {
            period: {
                from: todayStr,
                to: futureDateStr,
                days: parseInt(days)
            },
            summary: {
                total: upcomingSubscriptions.length,
                autoRenewals: autoRenewals.length,
                manualRenewals: manualRenewals.length
            },
            subscriptions: {
                autoRenewals: autoRenewals.map(sub => ({
                    id: sub.id,
                    name: sub.name,
                    amount: sub.amount,
                    currency: sub.currency,
                    nextBillingDate: sub.next_billing_date,
                    billingCycle: sub.billing_cycle
                })),
                manualRenewals: manualRenewals.map(sub => ({
                    id: sub.id,
                    name: sub.name,
                    amount: sub.amount,
                    currency: sub.currency,
                    nextBillingDate: sub.next_billing_date,
                    billingCycle: sub.billing_cycle
                }))
            }
        };

        handleQueryResult(res, result, 'Upcoming renewals preview');
    });
}

module.exports = SubscriptionManagementController;
