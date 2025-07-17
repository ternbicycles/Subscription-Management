const axios = require('axios');
const logger = require('../utils/logger');
const { SUPPORTED_CURRENCY_CODES, getBaseCurrency } = require('../config/currencies');

/**
 * 汇率API服务
 * 使用天行数据API获取实时汇率
 */
class ExchangeRateApiService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://apis.tianapi.com/fxrate/index';
        this.supportedCurrencies = SUPPORTED_CURRENCY_CODES;
    }

    /**
     * 获取单个汇率
     * @param {string} fromCurrency - 源货币
     * @param {string} toCurrency - 目标货币
     * @param {number} amount - 金额，默认为1
     * @returns {Promise<number>} 汇率值
     */
    async getExchangeRate(fromCurrency, toCurrency, amount = 1) {
        if (!this.apiKey) {
            throw new Error('TIANAPI_KEY not configured');
        }

        if (fromCurrency === toCurrency) {
            return 1.0;
        }

        try {
            const response = await axios.get(this.baseUrl, {
                params: {
                    key: this.apiKey,
                    fromcoin: fromCurrency,
                    tocoin: toCurrency,
                    money: amount
                },
                timeout: 10000 // 10秒超时
            });

            if (response.data.code === 200) {
                const rate = parseFloat(response.data.result.money) / amount;
                return rate;
            } else {
                throw new Error(`API Error: ${response.data.msg} (Code: ${response.data.code})`);
            }
        } catch (error) {
            if (error.response) {
                throw new Error(`API Request Failed: ${error.response.status} - ${error.response.data?.msg || error.message}`);
            } else if (error.request) {
                throw new Error('Network Error: Unable to reach exchange rate API');
            } else {
                throw new Error(`Exchange Rate Service Error: ${error.message}`);
            }
        }
    }

    /**
     * 批量获取汇率（以基础货币为准）
     * @returns {Promise<Array>} 汇率数组
     */
    async getAllExchangeRates() {
        if (!this.apiKey) {
            logger.warn('TIANAPI_KEY not configured, skipping exchange rate update');
            return [];
        }

        const rates = [];
        const baseCurrency = getBaseCurrency();

        // 添加基础货币到自身的汇率
        rates.push({
            from_currency: baseCurrency,
            to_currency: baseCurrency,
            rate: 1.0
        });

        // 获取其他货币相对于基础货币的汇率
        for (const currency of this.supportedCurrencies) {
            if (currency === baseCurrency) continue;

            try {
                const rate = await this.getExchangeRate(baseCurrency, currency);

                rates.push({
                    from_currency: baseCurrency,
                    to_currency: currency,
                    rate: rate
                });

                // 添加延迟以避免API限制
                await this.delay(500); // 500ms延迟
            } catch (error) {
                logger.error(`Failed to fetch rate for ${baseCurrency} -> ${currency}:`, error.message);
                // 继续处理其他货币，不中断整个过程
            }
        }

        return rates;
    }

    /**
     * 延迟函数
     * @param {number} ms - 延迟毫秒数
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 验证API密钥是否有效
     * @returns {Promise<boolean>} 是否有效
     */
    async validateApiKey() {
        if (!this.apiKey) {
            return false;
        }

        try {
            await this.getExchangeRate(getBaseCurrency(), 'USD');
            return true;
        } catch (error) {
            console.error('API Key validation failed:', error.message);
            return false;
        }
    }
}

module.exports = ExchangeRateApiService;
