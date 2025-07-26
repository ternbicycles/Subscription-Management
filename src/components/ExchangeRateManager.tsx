import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, RefreshCw, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';
import { type CurrencyType, isBaseCurrency } from '@/config/currency';
import { formatCurrencyAmount } from '@/utils/currency';
import { logger } from '@/utils/logger';
import { CURRENCY_NAMES } from '@/config/constants';

export function ExchangeRateManager() {
  const {
    exchangeRates,
    lastExchangeRateUpdate,
    apiKey,
    exchangeRateConfigStatus,
    fetchExchangeRates,
    updateExchangeRatesFromApi,
    currency,
    setCurrency,
    showOriginalCurrency,
    setShowOriginalCurrency
  } = useSettingsStore();
  
  const [isUpdating, setIsUpdating] = useState(false);

  // 手动更新汇率
  const handleUpdateRates = async () => {
    setIsUpdating(true);
    try {
      await updateExchangeRatesFromApi();
    } catch (error) {
      logger.error('Failed to update exchange rates:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const formatLastUpdate = (dateString: string | null) => {
    if (!dateString) return 'Never';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  return (
    <div className="space-y-4">
      {/* 上排：货币设置和状态卡片 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Currency Settings</CardTitle>
            <CardDescription>
              Set your preferred currency for expense calculation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 flex-1">
            <div>
              <Label htmlFor="currency">Default Currency</Label>
              <Select
                value={currency}
                onValueChange={async (value: CurrencyType) => await setCurrency(value)}
              >
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Select a currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CNY">CNY - Chinese Yuan</SelectItem>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                  <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                  <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                Your preferred currency for displaying subscription costs
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Show in original currency</Label>
                <p className="text-sm text-muted-foreground">
                  Always display the original subscription currency alongside converted values
                </p>
              </div>
              <Switch
                id="show-original"
                checked={showOriginalCurrency}
                onCheckedChange={setShowOriginalCurrency}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Exchange Rate Status
            </CardTitle>
            <CardDescription>
              Automatic exchange rate updates and current status
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col flex-1">
            <div className="space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">API Provider</p>
                  <p className="text-sm text-muted-foreground">tianapi.com</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium">API Configuration</p>
                  <div className="flex items-center gap-2">
                    {exchangeRateConfigStatus?.tianApiConfigured ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-600">Configured</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-red-600">Not configured</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Update Frequency</p>
                  <p className="text-sm text-muted-foreground">Daily (Automatic)</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium">Last Successful Update</p>
                  <p className="text-sm text-muted-foreground">
                    {formatLastUpdate(lastExchangeRateUpdate)}
                  </p>
                </div>
              </div>



              {!exchangeRateConfigStatus?.tianApiConfigured && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <p className="text-sm text-yellow-800">
                    API key not configured. Automatic updates are disabled.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <Button
                onClick={handleUpdateRates}
                disabled={isUpdating || !exchangeRateConfigStatus?.tianApiConfigured || !apiKey}
                size="sm"
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Update Now
              </Button>

              <Button
                onClick={fetchExchangeRates}
                variant="outline"
                size="sm"
                disabled={isUpdating}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Rates
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 汇率列表 */}
      <Card>
        <CardHeader>
          <CardTitle>Current Exchange Rates</CardTitle>
          <CardDescription>
            All rates are relative to {currency} (1 {currency} = X currency)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.entries(exchangeRates).map(([currency, rate]) => (
              <div
                key={currency}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="space-y-1">
                  <p className="font-medium">{currency}</p>
                  <p className="text-xs text-muted-foreground">
                    {CURRENCY_NAMES[currency as keyof typeof CURRENCY_NAMES] || currency}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrencyAmount(rate, currency, false)}
                  </p>
                </div>
                {isBaseCurrency(currency) && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
              </div>
            ))}
          </div>

          {Object.keys(exchangeRates).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No exchange rates available</p>
              <Button
                onClick={fetchExchangeRates}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                Load Rates
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
