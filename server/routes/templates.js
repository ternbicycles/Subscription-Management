const express = require('express');
const TemplateController = require('../controllers/templateController');

const router = express.Router();

/**
 * 模板相关路由
 * 提供通知模板的查询和预览功能
 */

// 获取支持的语言列表
// GET /api/templates/languages
router.get('/languages', TemplateController.getSupportedLanguages);

// 获取支持的通知类型列表
// GET /api/templates/types
router.get('/types', TemplateController.getSupportedNotificationTypes);

// 获取支持的渠道列表
// GET /api/templates/channels?notificationType=renewal_reminder&language=zh-CN
router.get('/channels', TemplateController.getSupportedChannels);

// 获取特定模板
// GET /api/templates/template?notificationType=renewal_reminder&language=zh-CN&channel=telegram
router.get('/template', TemplateController.getTemplate);

// 获取所有模板的概览信息
// GET /api/templates/overview
router.get('/overview', TemplateController.getTemplateOverview);

// 预览模板渲染结果
// POST /api/templates/preview
router.post('/preview', TemplateController.previewTemplate);

module.exports = router;
