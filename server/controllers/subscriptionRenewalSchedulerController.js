const { asyncHandler } = require('../middleware/errorHandler');
const { success, error } = require('../utils/responseHelper');

/**
 * 订阅续费定时任务控制器
 * 处理订阅续费定时任务相关的HTTP请求
 */
class SubscriptionRenewalSchedulerController {
    constructor(subscriptionRenewalScheduler) {
        this.subscriptionRenewalScheduler = subscriptionRenewalScheduler;
    }

    /**
     * 手动触发维护任务
     */
    runMaintenanceNow = asyncHandler(async (req, res) => {
        const result = await this.subscriptionRenewalScheduler.runMaintenanceNow();

        if (result.success) {
            success(res, result, 'Maintenance completed successfully');
        } else {
            error(res, result.error || 'Maintenance failed', 500);
        }
    });

    /**
     * 获取定时任务状态
     */
    getStatus = asyncHandler(async (req, res) => {
        const status = this.subscriptionRenewalScheduler.getStatus();
        success(res, status, 'Scheduler status retrieved');
    });
}

module.exports = SubscriptionRenewalSchedulerController;
