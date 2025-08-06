import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, History, BarChart3, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { notificationApi, NotificationSetting, NotificationHistory, NotificationStats } from '@/services/notificationApi';
import { useToast } from '@/hooks/use-toast';
import { TelegramConfig } from './TelegramConfig';
import { NotificationRules } from './NotificationRules';

interface NotificationSettingsProps {
  userId: number;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({ userId }) => {
  const { t } = useTranslation('notification');
  const { toast } = useToast();
  
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [history, setHistory] = useState<NotificationHistory[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await notificationApi.getSettings(userId);
      // The API client already extracts the data field, so response is the data directly
      setSettings(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Failed to load notification settings:', error);
      toast({
        title: t('fetchSettingsError'),
        description: t('fetchSettingsError'),
        variant: 'destructive'
      });
      // Set empty array on error to prevent undefined
      setSettings([]);
    } finally {
      setLoading(false);
    }
  }, [userId, t, toast]);

  const loadHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const response = await notificationApi.getHistory(userId, { limit: 10 });
      // The API client already extracts the data field, so response is the data directly
      setHistory(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to load notification history:', error);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [userId]);

  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const response = await notificationApi.getStats(userId);
      // The API client already extracts the data field, so response is the data directly
      setStats(response || null);
    } catch (error) {
      console.error('Failed to load notification stats:', error);
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadSettings();
    loadStats();
    loadHistory();
  }, [userId, loadSettings, loadStats, loadHistory]);

  const updateSetting = async (updatedSetting: NotificationSetting) => {
    try {
      await notificationApi.updateSetting(updatedSetting.id, updatedSetting);
      toast({
        title: t('settingUpdated'),
        description: t('settingsUpdated'),
      });
      loadSettings(); // Reload to get updated data
    } catch (error) {
      console.error('Failed to update setting:', error);
      toast({
        title: t('updateSettingError'),
        description: t('updateSettingError'),
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      sent: { variant: 'default' as const, label: t('history.statuses.sent') },
      failed: { variant: 'destructive' as const, label: t('history.statuses.failed') },
      pending: { variant: 'secondary' as const, label: t('history.statuses.pending') },
      retrying: { variant: 'outline' as const, label: t('history.statuses.retrying') }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const renderStats = () => {
    if (!stats) return null;

    const successRate = stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 0;

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-sm text-muted-foreground">{t('stats.total')}</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
          <div className="text-sm text-muted-foreground">{t('stats.sent')}</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          <div className="text-sm text-muted-foreground">{t('stats.failed')}</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">{successRate}%</div>
          <div className="text-sm text-muted-foreground">{t('stats.successRate')}</div>
        </div>
      </div>
    );
  };

  const renderHistory = () => {
    if (historyLoading) {
      return (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-16 bg-muted rounded"></div>
            </div>
          ))}
        </div>
      );
    }

    if (history.length === 0) {
      return (
        <Alert>
          <History className="h-4 w-4" />
          <AlertDescription>
            {t('history.noHistory')}
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="space-y-2">
        {history.map((item) => (
          <div key={item.id} className="flex items-center justify-between p-3 border rounded">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {getStatusBadge(item.status)}
                <Badge variant="outline">{item.channel_type}</Badge>
                <span className="text-sm font-medium">
                  {t(`types.${item.notification_type}`)}
                </span>
                {item.subscription_name && (
                  <span className="text-sm text-muted-foreground">
                    - {item.subscription_name}
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(item.created_at).toLocaleString()}
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              {item.sent_at && (
                <div>{new Date(item.sent_at).toLocaleString()}</div>
              )}
              {item.error_message && (
                <div className="text-red-600">{item.error_message}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('notificationSettings')}</h2>
          <p className="text-muted-foreground">
            管理您的通知偏好和渠道配置
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            loadSettings();
            loadStats();
            loadHistory();
          }}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          刷新
        </Button>
      </div>

      <Tabs defaultValue="channels" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="channels" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            渠道配置
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            通知规则
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            历史记录
          </TabsTrigger>
        </TabsList>

        <TabsContent value="channels" className="space-y-6">
          <TelegramConfig 
            userId={userId}
            onConfigChange={() => {
              loadSettings();
              loadStats();
            }}
          />
        </TabsContent>

        <TabsContent value="rules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('notificationRules')}</CardTitle>
              <CardDescription>
                配置您希望接收的通知类型和发送方式
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NotificationRules
                settings={settings}
                onUpdate={updateSetting}
                loading={loading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {t('stats.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                renderStats()
              )}
            </CardContent>
          </Card>

          {/* History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                {t('history.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderHistory()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};