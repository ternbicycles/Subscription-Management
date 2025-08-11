const { 
    getTemplate, 
    getSupportedLanguages, 
    getSupportedNotificationTypes, 
    getSupportedChannels 
} = require('../config/notificationTemplates');

/**
 * 通知模板控制器
 * 提供模板相关的 API 端点
 */
class TemplateController {
    /**
     * 获取支持的语言列表
     */
    static getSupportedLanguages(req, res) {
        try {
            const languages = getSupportedLanguages();
            res.json({
                success: true,
                data: languages
            });
        } catch (error) {
            console.error('Error getting supported languages:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get supported languages'
            });
        }
    }

    /**
     * 获取支持的通知类型列表
     */
    static getSupportedNotificationTypes(req, res) {
        try {
            const types = getSupportedNotificationTypes();
            res.json({
                success: true,
                data: types
            });
        } catch (error) {
            console.error('Error getting supported notification types:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get supported notification types'
            });
        }
    }

    /**
     * 获取支持的渠道列表
     */
    static getSupportedChannels(req, res) {
        try {
            const { notificationType, language = 'zh-CN' } = req.query;
            
            if (!notificationType) {
                return res.status(400).json({
                    success: false,
                    error: 'notificationType is required'
                });
            }

            const channels = getSupportedChannels(notificationType, language);
            res.json({
                success: true,
                data: channels
            });
        } catch (error) {
            console.error('Error getting supported channels:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get supported channels'
            });
        }
    }

    /**
     * 获取特定模板
     */
    static getTemplate(req, res) {
        try {
            const { notificationType, language = 'zh-CN', channel = 'telegram' } = req.query;
            
            if (!notificationType) {
                return res.status(400).json({
                    success: false,
                    error: 'notificationType is required'
                });
            }

            const template = getTemplate(notificationType, language, channel);
            
            if (!template) {
                return res.status(404).json({
                    success: false,
                    error: 'Template not found'
                });
            }

            res.json({
                success: true,
                data: template
            });
        } catch (error) {
            console.error('Error getting template:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get template'
            });
        }
    }

    /**
     * 获取所有模板的概览信息
     */
    static getTemplateOverview(req, res) {
        try {
            const types = getSupportedNotificationTypes();
            const languages = getSupportedLanguages();
            
            const overview = types.map(type => {
                const languageChannels = {};
                
                languages.forEach(lang => {
                    const channels = getSupportedChannels(type, lang);
                    if (channels.length > 0) {
                        languageChannels[lang] = channels;
                    }
                });
                
                return {
                    notificationType: type,
                    supportedLanguages: Object.keys(languageChannels),
                    languageChannels
                };
            });

            res.json({
                success: true,
                data: {
                    overview,
                    totalTypes: types.length,
                    totalLanguages: languages.length
                }
            });
        } catch (error) {
            console.error('Error getting template overview:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get template overview'
            });
        }
    }

    /**
     * 预览模板渲染结果
     */
    static previewTemplate(req, res) {
        try {
            const { 
                notificationType, 
                language = 'zh-CN', 
                channel = 'telegram',
                sampleData = {}
            } = req.body;
            
            if (!notificationType) {
                return res.status(400).json({
                    success: false,
                    error: 'notificationType is required'
                });
            }

            const template = getTemplate(notificationType, language, channel);
            
            if (!template) {
                return res.status(404).json({
                    success: false,
                    error: 'Template not found'
                });
            }

            // 使用示例数据或默认数据进行模板渲染
            const defaultSampleData = {
                name: 'Netflix',
                plan: 'Premium',
                amount: '15.99',
                currency: 'USD',
                next_billing_date: '2024-01-15',
                payment_method: 'Credit Card',
                status: 'active',
                billing_cycle: 'monthly'
            };

            const templateData = { ...defaultSampleData, ...sampleData };
            
            // 简单的模板替换
            let content = template.content_template;
            let subject = template.subject_template;
            
            Object.keys(templateData).forEach(key => {
                const regex = new RegExp(`{{${key}}}`, 'g');
                content = content.replace(regex, templateData[key]);
                if (subject) {
                    subject = subject.replace(regex, templateData[key]);
                }
            });

            res.json({
                success: true,
                data: {
                    template,
                    renderedContent: content,
                    renderedSubject: subject,
                    sampleData: templateData
                }
            });
        } catch (error) {
            console.error('Error previewing template:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to preview template'
            });
        }
    }
}

module.exports = TemplateController;
