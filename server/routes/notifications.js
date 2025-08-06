const express = require('express');
const NotificationController = require('../controllers/notificationController');
const auth = require('../middleware/auth');

function createNotificationRoutes(db) {
    const router = express.Router();
    const notificationController = new NotificationController();

    // Public routes (if any)
    
    return router;
}

function createProtectedNotificationRoutes(db) {
    const router = express.Router();
    const notificationController = new NotificationController();

    // 通知设置路由
    router.get('/settings/:userId', notificationController.getAllSettings);
    router.get('/settings/:userId/:type', notificationController.getSettings);
    router.put('/settings/:id', notificationController.updateSetting);

    // 渠道配置路由
    router.post('/channels/:userId', notificationController.configureChannel);
    router.get('/channels/:userId/:channelType', notificationController.getChannelConfig);
    router.get('/channels/:id/:channelType', notificationController.getChannelConfig);

    // 通知操作路由
    router.post('/send', notificationController.sendNotification);
    router.post('/test/:userId', notificationController.testNotification);

    // 历史记录路由
    router.get('/history/:userId', notificationController.getNotificationHistory);

    // 统计路由
    router.get('/stats/:userId', notificationController.getNotificationStats);

    // Telegram相关路由
    router.post('/validate-chat-id', notificationController.validateChatId);
    router.get('/telegram/bot-info', notificationController.getBotInfo);
    router.get('/telegram/config-status', notificationController.getTelegramConfigStatus);

    return router;
}

module.exports = { createNotificationRoutes, createProtectedNotificationRoutes };