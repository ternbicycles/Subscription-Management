const express = require('express');
const SubscriptionRenewalSchedulerController = require('../controllers/subscriptionRenewalSchedulerController');

/**
 * 创建订阅续费定时任务相关的路由
 * @param {Object} subscriptionRenewalScheduler - 订阅续费定时任务服务实例
 * @returns {Object} Express router
 */
function createSubscriptionRenewalSchedulerRoutes(subscriptionRenewalScheduler) {
    const router = express.Router();
    const schedulerController = new SubscriptionRenewalSchedulerController(subscriptionRenewalScheduler);

    // 获取定时任务状态 (公开接口)
    router.get('/status', schedulerController.getStatus);

    return router;
}

/**
 * 创建受保护的订阅续费定时任务路由 (需要API密钥)
 * @param {Object} subscriptionRenewalScheduler - 订阅续费定时任务服务实例
 * @returns {Object} Express router
 */
function createProtectedSubscriptionRenewalSchedulerRoutes(subscriptionRenewalScheduler) {
    const router = express.Router();
    const schedulerController = new SubscriptionRenewalSchedulerController(subscriptionRenewalScheduler);

    // 手动触发维护任务 (需要API密钥)
    router.post('/maintenance/run', schedulerController.runMaintenanceNow);

    return router;
}

module.exports = {
    createSubscriptionRenewalSchedulerRoutes,
    createProtectedSubscriptionRenewalSchedulerRoutes
};
