import { apiClient } from '@/utils/api-client';

export interface NotificationSetting {
  id: number;
  user_id: number;
  notification_type: string;
  is_enabled: boolean;
  advance_days: number;
  notification_channels: string[];
  repeat_notification: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationChannel {
  id: number;
  user_id: number;
  channel_type: string;
  channel_config: Record<string, unknown>;
  config?: Record<string, unknown>; // Parsed config object
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationHistory {
  id: number;
  user_id: number;
  subscription_id: number;
  notification_type: string;
  channel_type: string;
  status: string;
  recipient: string;
  message_content: string;
  error_message: string | null;
  retry_count: number;
  max_retry: number;
  scheduled_at: string;
  sent_at: string | null;
  created_at: string;
  subscription_name?: string;
}

export interface NotificationStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  retrying: number;
  byType: Record<string, number>;
  byChannel: Record<string, number>;
}

export interface TelegramBotInfo {
  id: number;
  first_name: string;
  username: string;
  can_join_groups: boolean;
  can_read_all_group_messages: boolean;
  supports_inline_queries: boolean;
}

export interface TelegramConfigStatus {
  configured: boolean;
  hasToken: boolean;
  isPlaceholder: boolean;
}

export const notificationApi = {
  // 获取通知设置
  getSettings: (userId: number) =>
    apiClient.get<NotificationSetting[]>(`/protected/notifications/settings/${userId}`),

  // 更新通知设置
  updateSetting: (settingId: number, setting: Partial<NotificationSetting>) =>
    apiClient.put<{ message: string }>(`/protected/notifications/settings/${settingId}`, setting),

  // 配置通知渠道
  configureChannel: (userId: number, channelType: string, config: Record<string, unknown>) =>
    apiClient.post<{ message: string }>(`/protected/notifications/channels/${userId}`, {
      channel_type: channelType,
      config
    }),

  // 获取渠道配置
  getChannelConfig: (userId: number, channelType: string) =>
    apiClient.get<NotificationChannel>(`/protected/notifications/channels/${userId}/${channelType}`),

  // 测试通知
  testNotification: (userId: number, channelType: string) =>
    apiClient.post(`/protected/notifications/test/${userId}`, {
      channel_type: channelType
    }),

  // 发送通知
  sendNotification: (data: {
    user_id?: number;
    subscription_id: number;
    notification_type: string;
    channels?: string[];
  }) =>
    apiClient.post(`/protected/notifications/send`, data),

  // 获取通知历史
  getHistory: (userId: number, params?: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
  }) => {
    let url = `/protected/notifications/history/${userId}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    return apiClient.get<{
      data: NotificationHistory[];
      pagination: {
        page: number;
        limit: number;
        total: number;
      };
    }>(url);
  },



  // 获取通知统计
  getStats: (userId: number) =>
    apiClient.get<NotificationStats>(`/protected/notifications/stats/${userId}`),

  // 验证Telegram Chat ID
  validateChatId: (chatId: string) =>
    apiClient.post(`/protected/notifications/validate-chat-id`, { chat_id: chatId }),

  // 获取Telegram Bot信息
  getBotInfo: () =>
    apiClient.get<{ success: boolean; botInfo: TelegramBotInfo }>(`/protected/notifications/telegram/bot-info`),

  // 获取Telegram配置状态
  getTelegramConfigStatus: () =>
    apiClient.get<TelegramConfigStatus>(`/protected/notifications/telegram/config-status`)
};