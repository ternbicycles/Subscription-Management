const express = require('express');
const SchedulerController = require('../controllers/schedulerController');

/**
 * 创建调度器相关的路由
 * @param {Object} notificationScheduler - 通知调度器实例
 * @returns {Object} Express router
 */
function createSchedulerRoutes(notificationScheduler) {
    const router = express.Router();
    const schedulerController = new SchedulerController(notificationScheduler);

    // 获取调度器设置 (公开接口)
    router.get('/settings', schedulerController.getSettings);
    
    // 获取调度器状态 (公开接口)
    router.get('/status', schedulerController.getStatus);

    return router;
}

/**
 * 创建受保护的调度器路由 (需要API密钥)
 * @param {Object} notificationScheduler - 通知调度器实例
 * @returns {Object} Express router
 */
function createProtectedSchedulerRoutes(notificationScheduler) {
    const router = express.Router();
    const schedulerController = new SchedulerController(notificationScheduler);

    // 更新调度器设置 (需要API密钥)
    router.put('/settings', schedulerController.updateSettings);
    
    // 手动触发通知检查 (需要API密钥)
    router.post('/trigger', schedulerController.triggerCheck);

    return router;
}

module.exports = {
    createSchedulerRoutes,
    createProtectedSchedulerRoutes
};
