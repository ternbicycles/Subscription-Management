/**
 * 通知系统配置
 * 集中管理通知相关的常量和配置
 */

module.exports = {
  // 通知类型
  SUPPORTED_NOTIFICATION_TYPES: [
    'renewal_reminder',
    'expiration_warning', 
    'renewal_success',
    'renewal_failure',
    'subscription_change'
  ],

  // 支持的通知渠道
  SUPPORTED_CHANNELS: ['telegram', 'email'],

  // 默认通知渠道
  DEFAULT_NOTIFICATION_CHANNELS: JSON.parse(
    process.env.NOTIFICATION_DEFAULT_CHANNELS ||
    '["telegram"]'
  ),

  // 语言设置
  SUPPORTED_LANGUAGES: ['zh-CN', 'en'],
  DEFAULT_LANGUAGE: process.env.NOTIFICATION_DEFAULT_LANGUAGE || 'zh-CN',

  // 时区设置
  SUPPORTED_TIMEZONES: [
    'Asia/Shanghai',
    'Asia/Tokyo', 
    'Asia/Seoul',
    'Asia/Hong_Kong',
    'America/New_York',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'UTC'
  ],
  DEFAULT_TIMEZONE: process.env.SCHEDULER_TIMEZONE || 'Asia/Shanghai',

  // 调度器设置
  DEFAULT_CHECK_TIME: process.env.SCHEDULER_CHECK_TIME || '09:00',

  // 通知设置默认值
  DEFAULT_ADVANCE_DAYS: parseInt(process.env.NOTIFICATION_DEFAULT_ADVANCE_DAYS) || 7,
  DEFAULT_REPEAT_NOTIFICATION: (process.env.NOTIFICATION_DEFAULT_REPEAT_NOTIFICATION) === 'true',

  // 分页设置
  DEFAULT_PAGE_SIZE: parseInt(process.env.DEFAULT_PAGE_SIZE) || 20,
  MAX_PAGE_SIZE: parseInt(process.env.MAX_PAGE_SIZE) || 100,

  // 缓存设置
  CACHE_TTL: {
    SETTINGS: parseInt(process.env.CACHE_TTL_SETTINGS) || 300, // 5分钟
    CHANNELS: parseInt(process.env.CACHE_TTL_CHANNELS) || 600, // 10分钟
    TEMPLATES: parseInt(process.env.CACHE_TTL_TEMPLATES) || 3600 // 1小时
  },

  // 重试设置
  RETRY_ATTEMPTS: parseInt(process.env.RETRY_ATTEMPTS) || 3,
  RETRY_DELAY: parseInt(process.env.RETRY_DELAY) || 1000, // 1秒

  // 验证规则
  VALIDATION: {
    CHAT_ID_MIN_LENGTH: 1,
    CHAT_ID_MAX_LENGTH: 50,
    ADVANCE_DAYS_MIN: 0,
    ADVANCE_DAYS_MAX: 30,
    MESSAGE_MAX_LENGTH: 4096 // Telegram限制
  }
};
