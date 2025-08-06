import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Loader2, 
  RefreshCw, 
  History, 
  BarChart3, 
  Search,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { notificationApi, NotificationHistory as NotificationHistoryType, NotificationStats } from '@/services/notificationApi';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/utils/date';

interface NotificationHistoryProps {
  userId: number;
}

export const NotificationHistory: React.FC<NotificationHistoryProps> = ({ userId }) => {
  const { t } = useTranslation('notification');
  const { toast } = useToast();
  
  const [history, setHistory] = useState<NotificationHistoryType[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [historyPagination, setHistoryPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const loadHistory = useCallback(async (page = 1) => {
    try {
      setHistoryLoading(true);
      const params: any = {
        page,
        limit: historyPagination.limit
      };
      
      // Add filter parameters to API call
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (typeFilter !== 'all') {
        params.type = typeFilter;
      }
      // Note: searchTerm and channelFilter still handled on frontend for now
      // as backend doesn't support these filters yet
      
      const response = await notificationApi.getHistory(userId, params);
      setHistory(Array.isArray(response.data) ? response.data : []);
      setHistoryPagination(prev => ({
        ...prev,
        page: response.pagination.page,
        total: response.pagination.total,
        totalPages: Math.ceil(response.pagination.total / response.pagination.limit)
      }));
    } catch (error) {
      console.error('Failed to load notification history:', error);
      toast({
        title: t('fetchSettingsError'),
        description: t('fetchSettingsError'),
        variant: 'destructive'
      });
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [userId, historyPagination.limit, statusFilter, typeFilter, t, toast]);

  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const response = await notificationApi.getStats(userId);
      setStats(response);
    } catch (error) {
      console.error('Failed to load notification stats:', error);
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadHistory();
    loadStats();
  }, [loadHistory, loadStats]);

  // Reload data when status or type filter changes
  useEffect(() => {
    setHistoryPagination(prev => ({ ...prev, page: 1 }));
    loadHistory(1);
  }, [statusFilter, typeFilter]);

  const handlePageChange = (page: number) => {
    loadHistory(page);
  };



  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'sent':
        return 'default';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Filter history based on search and channel filters (status and type are handled by backend)
  const filteredHistory = history.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.message_content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.recipient.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesChannel = channelFilter === 'all' || item.channel_type === channelFilter;
    
    return matchesSearch && matchesChannel;
  });

  // Define all possible filter options
  const allStatuses = ['sent', 'failed'];
  const allTypes = ['renewal_reminder', 'expiration_warning', 'renewal_success', 'renewal_failure', 'subscription_change'];
  const allChannels = ['telegram'];
  
  // Get unique values from current data for information purposes
  const uniqueStatuses = Array.from(new Set(history.map(h => h.status)));
  const uniqueTypes = Array.from(new Set(history.map(h => h.notification_type)));
  const uniqueChannels = Array.from(new Set(history.map(h => h.channel_type)));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <History className="h-8 w-8" />
            {t('history.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('history.description')}
          </p>
        </div>
        <Button
          onClick={() => {
            loadHistory(historyPagination.page);
            loadStats();
          }}
          disabled={historyLoading || statsLoading}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${historyLoading || statsLoading ? 'animate-spin' : ''}`} />
          {t('refresh')}
        </Button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('stats.total')}</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('stats.sent')}</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
              {/* <p className="text-xs text-muted-foreground">
                {stats.total > 0 ? `${Math.round((stats.sent / stats.total) * 100)}%` : '0%'} {t('stats.successRate')}
              </p> */}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('stats.failed')}</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('stats.successRate')}</CardTitle>
              <BarChart3 className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.total > 0 ? `${Math.round((stats.sent / stats.total) * 100)}%` : '0%'}
              </div>
              {/* <p className="text-xs text-muted-foreground">
                {stats.sent}/{stats.total} {t('stats.success')}
              </p> */}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5" />
            {t('history.filterAndSearch')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <SearchInput
                placeholder={t('history.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<Search className="h-4 w-4 text-muted-foreground" />}
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('history.statusFilter')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('history.allStatuses')}</SelectItem>
                {allStatuses.map(status => (
                  <SelectItem key={status} value={status}>
                    {t(`history.statuses.${status}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('history.typeFilter')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('history.allTypes')}</SelectItem>
                {allTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {t(`types.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('history.channelFilter')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('history.allChannels')}</SelectItem>
                {allChannels.map(channel => (
                  <SelectItem key={channel} value={channel}>
                    {t(`channels.${channel}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* History List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {t('history.title')}
          </CardTitle>
          <CardDescription>
            {searchTerm || channelFilter !== 'all' 
              ? t('history.recordsShown', { count: filteredHistory.length, total: historyPagination.total })
              : t('history.totalRecords', { total: historyPagination.total })
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredHistory.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t('history.noHistory')}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(item.status)}
                      <Badge variant={getStatusVariant(item.status)}>
                        {t(`history.statuses.${item.status}`)}
                      </Badge>
                      <Badge variant="outline">
                        {t(`types.${item.notification_type}`)}
                      </Badge>
                      <Badge variant="secondary">
                        {t(`channels.${item.channel_type}`)}
                      </Badge>
                    </div>
                    
                    <div>
                      <div className="font-medium">{item.message_content.substring(0, 100)}...</div>
                      <div className="text-sm text-muted-foreground">
                        {t('history.recipient')}: {item.recipient}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {t('history.scheduledAt')}: {formatDate(item.scheduled_at)}
                      </div>
                      {item.sent_at && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {t('history.sentAt')}: {formatDate(item.sent_at)}
                        </div>
                      )}
                    </div>
                    
                    {item.error_message && (
                      <Alert className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          {item.error_message}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                  

                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {historyPagination.totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination
            currentPage={historyPagination.page}
            totalPages={historyPagination.totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
};
