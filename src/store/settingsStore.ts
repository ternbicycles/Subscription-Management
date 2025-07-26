import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ExchangeRateApi, type ExchangeRateConfigStatus } from '@/services/exchangeRateApi'
import { logger } from '@/utils/logger'
import { BASE_CURRENCY, DEFAULT_EXCHANGE_RATES, type CurrencyType } from '@/config/currency'
import { apiClient } from '@/utils/api-client'

export type ThemeType = 'light' | 'dark' | 'system'

interface SettingsState {
  // --- Synced with Backend ---
  apiKey: string | null
  setApiKey: (apiKey: string) => void
  currency: CurrencyType
  setCurrency: (currency: CurrencyType) => Promise<void>
  theme: ThemeType
  setTheme: (theme: ThemeType) => Promise<void>
  
  // Currency display settings
  showOriginalCurrency: boolean
  setShowOriginalCurrency: (show: boolean) => void
  
  // Exchange rate settings
  exchangeRates: Record<string, number>
  updateExchangeRate: (currency: string, rate: number) => void
  lastExchangeRateUpdate: string | null
  updateLastExchangeRateUpdate: () => void
  fetchExchangeRates: () => Promise<void>
  updateExchangeRatesFromApi: () => Promise<void>
  
  // Exchange rate configuration status
  exchangeRateConfigStatus: ExchangeRateConfigStatus | null
  fetchExchangeRateConfigStatus: () => Promise<void>
  
  // Data management
  resetSettings: () => void
  fetchSettings: () => Promise<void>
  isLoading: boolean
  error: string | null
}

export const initialSettings = {
  // Synced
  apiKey: null,
  currency: BASE_CURRENCY,
  theme: 'system' as ThemeType,
  showOriginalCurrency: true,

  exchangeRates: DEFAULT_EXCHANGE_RATES,
  lastExchangeRateUpdate: null,
  exchangeRateConfigStatus: null,
  isLoading: false,
  error: null
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...initialSettings,
      
      fetchSettings: async () => {
        set({ isLoading: true, error: null })
        try {
          const loadedSettings = await apiClient.get<any>('/settings')
          const settings = {
            currency: loadedSettings.currency || initialSettings.currency,
            theme: loadedSettings.theme || initialSettings.theme,
            showOriginalCurrency: loadedSettings.show_original_currency !== undefined
              ? Boolean(loadedSettings.show_original_currency)
              : initialSettings.showOriginalCurrency,
          }

          set({ ...settings, isLoading: false })
          // Don't apply theme here - let next-themes handle it

          // 获取汇率数据和配置状态
          get().fetchExchangeRates()
          get().fetchExchangeRateConfigStatus()

        } catch (error: any) {
          // If settings don't exist, the backend might 404, which is okay.
          if (error.status === 404) {
            logger.warn('Settings not found on backend. Using local/default settings.')
            set({ isLoading: false })
            return
          }
          logger.error('Error fetching settings:', error)
          set({ error: error.message, isLoading: false })
        }
      },
      
      setApiKey: (apiKey) => set({ apiKey }),
      
      setCurrency: async (currency) => {
        set({ currency })
        
        // Sync to backend
        try {
          await apiClient.put('/protected/settings', { currency })
        } catch (error: any) {
          logger.error('Error saving currency setting:', error)
          // Could optionally revert the local change here
        }
      },
      
      setTheme: async (theme) => {
        set({ theme })
        // Don't apply theme here - let next-themes handle it
        // localStorage is also handled by next-themes

        // Sync to backend
        try {
          await apiClient.put('/protected/settings', { theme })
        } catch (error: any) {
          logger.error('Error saving theme setting:', error)
        }
      },


      setShowOriginalCurrency: async (showOriginalCurrency) => {
        set({ showOriginalCurrency })

        // Sync to backend
        try {
          await apiClient.put('/protected/settings', { showOriginalCurrency })
        } catch (error: any) {
          logger.error('Error saving showOriginalCurrency setting:', error)
          // Could optionally revert the local change here
        }
      },

      
      updateExchangeRate: (currency, rate) => set((state) => ({
        exchangeRates: { ...state.exchangeRates, [currency]: rate }
      })),
      
      updateLastExchangeRateUpdate: () => set({
        lastExchangeRateUpdate: new Date().toISOString()
      }),

      fetchExchangeRates: async () => {
        try {
          const rates = await ExchangeRateApi.getAllRates();
          const rateMap = ExchangeRateApi.ratesToMap(rates);

          set({
            exchangeRates: rateMap,
            lastExchangeRateUpdate: new Date().toISOString()
          });
        } catch (error: any) {
          logger.error('Error fetching exchange rates:', error);
          // 保持现有汇率，不更新错误状态，因为这可能在后台运行
        }
      },

      updateExchangeRatesFromApi: async () => {
        const { apiKey } = get();
        if (!apiKey) {
          throw new Error('API key not configured');
        }

        try {
          await ExchangeRateApi.updateRates();
          // 更新成功后重新获取汇率
          await get().fetchExchangeRates();
        } catch (error: any) {
          logger.error('Error updating exchange rates:', error);
          set({ error: error.message });
          throw error;
        }
      },

      fetchExchangeRateConfigStatus: async () => {
        try {
          const configStatus = await ExchangeRateApi.getConfigStatus();
          set({ exchangeRateConfigStatus: configStatus });
        } catch (error: any) {
          logger.error('Error fetching exchange rate config status:', error);
          // 不设置错误状态，因为这不是关键功能
        }
      },
      
      resetSettings: async () => {
        try {
          await apiClient.post('/protected/settings/reset')

          // Reset local state to initial settings
          set({ ...initialSettings })
          // Don't apply theme here - let next-themes handle it

          return { error: null }
        } catch (error: any) {
          logger.error('Error resetting settings:', error)
          set({ error: error.message })
          return { error }
        }
      },
    }),
    {
      name: 'settings-storage',
      // Persist all settings except for loading/error states.
      partialize: (state) => {
        const { isLoading, error, ...rest } = state;
        // Functions are not persisted, so we don't need to omit them.
        return rest;
      }
    }
  )
)