const BaseRepository = require('../utils/BaseRepository');
const logger = require('../utils/logger');

/**
 * 汇率数据库服务类
 * 处理汇率数据的数据库操作和业务逻辑
 */
class ExchangeRateDbService extends BaseRepository {
    constructor(db) {
        super(db, 'exchange_rates');
    }

    /**
     * 获取所有汇率
     * @returns {Array} 汇率列表
     */
    async getAllExchangeRates() {
        try {
            return this.findAll({ orderBy: 'from_currency, to_currency' });
        } catch (error) {
            logger.error('Failed to get all exchange rates:', error.message);
            throw error;
        }
    }

    /**
     * 获取特定货币对的汇率
     * @param {string} fromCurrency - 源货币
     * @param {string} toCurrency - 目标货币
     * @returns {Object|null} 汇率数据
     */
    async getExchangeRate(fromCurrency, toCurrency) {
        try {
            const from = fromCurrency.toUpperCase();
            const to = toCurrency.toUpperCase();

            // 首先尝试直接查找汇率
            let rate = this.findOne({
                from_currency: from,
                to_currency: to
            });

            if (rate) {
                return rate;
            }

            // 如果没有直接汇率，尝试反向汇率
            const reverseRate = this.findOne({
                from_currency: to,
                to_currency: from
            });

            if (reverseRate && reverseRate.rate !== 0) {
                // 返回反向汇率的倒数
                return {
                    ...reverseRate,
                    from_currency: from,
                    to_currency: to,
                    rate: 1 / reverseRate.rate,
                    is_reverse: true // 标记这是反向计算的汇率
                };
            }

            return null;
        } catch (error) {
            logger.error(`Failed to get exchange rate ${fromCurrency}/${toCurrency}:`, error.message);
            throw error;
        }
    }

    /**
     * 获取货币的所有汇率
     * @param {string} currency - 货币代码
     * @returns {Array} 汇率列表
     */
    async getRatesForCurrency(currency) {
        try {
            const currencyCode = currency.toUpperCase();
            
            // 获取以该货币为源货币的汇率
            const fromRates = this.findAll({
                filters: { from_currency: currencyCode },
                orderBy: 'to_currency'
            });

            // 获取以该货币为目标货币的汇率
            const toRates = this.findAll({
                filters: { to_currency: currencyCode },
                orderBy: 'from_currency'
            });

            return {
                fromRates,
                toRates,
                currency: currencyCode
            };
        } catch (error) {
            logger.error(`Failed to get rates for currency ${currency}:`, error.message);
            throw error;
        }
    }

    /**
     * 创建或更新汇率
     * @param {string} fromCurrency - 源货币
     * @param {string} toCurrency - 目标货币
     * @param {number} rate - 汇率
     * @param {string} source - 数据源
     * @returns {Object} 操作结果
     */
    async upsertExchangeRate(fromCurrency, toCurrency, rate, source = 'manual') {
        try {
            const from = fromCurrency.toUpperCase();
            const to = toCurrency.toUpperCase();

            // 验证汇率数据
            this._validateExchangeRateData(from, to, rate);

            // 检查是否已存在
            const existing = await this.getExchangeRate(from, to);

            const rateData = {
                from_currency: from,
                to_currency: to,
                rate: parseFloat(rate),
                source,
                updated_at: new Date().toISOString()
            };

            if (existing) {
                // 更新现有汇率
                const result = this.update(existing.id, rateData);
                logger.info(`Updated exchange rate ${from}/${to}: ${rate}`);
                return { ...result, operation: 'update' };
            } else {
                // 创建新汇率
                rateData.created_at = new Date().toISOString();
                const result = this.create(rateData);
                logger.info(`Created exchange rate ${from}/${to}: ${rate}`);
                return { ...result, operation: 'create' };
            }
        } catch (error) {
            logger.error(`Failed to upsert exchange rate ${fromCurrency}/${toCurrency}:`, error.message);
            throw error;
        }
    }

    /**
     * 批量更新汇率
     * @param {Array} rates - 汇率数据数组
     * @param {string} source - 数据源
     * @returns {Object} 批量操作结果
     */
    async bulkUpsertExchangeRates(rates, source = 'api') {
        try {
            const results = {
                created: 0,
                updated: 0,
                errors: []
            };

            // 使用事务确保数据一致性
            return this.transaction(() => {
                for (const rateData of rates) {
                    try {
                        const { from_currency, to_currency, rate } = rateData;
                        
                        // 验证数据
                        this._validateExchangeRateData(from_currency, to_currency, rate);
                        
                        // 检查是否已存在
                        const existing = this.findOne({
                            from_currency: from_currency.toUpperCase(),
                            to_currency: to_currency.toUpperCase()
                        });

                        const data = {
                            from_currency: from_currency.toUpperCase(),
                            to_currency: to_currency.toUpperCase(),
                            rate: parseFloat(rate),
                            source,
                            updated_at: new Date().toISOString()
                        };

                        if (existing) {
                            this.update(existing.id, data);
                            results.updated++;
                        } else {
                            data.created_at = new Date().toISOString();
                            this.create(data);
                            results.created++;
                        }
                    } catch (error) {
                        results.errors.push({
                            rate: rateData,
                            error: error.message
                        });
                    }
                }
                return results;
            });
        } catch (error) {
            logger.error('Failed to bulk update exchange rates:', error.message);
            throw error;
        }
    }

    /**
     * 删除汇率
     * @param {string} fromCurrency - 源货币
     * @param {string} toCurrency - 目标货币
     * @returns {Object} 删除结果
     */
    async deleteExchangeRate(fromCurrency, toCurrency) {
        try {
            const from = fromCurrency.toUpperCase();
            const to = toCurrency.toUpperCase();

            const existing = await this.getExchangeRate(from, to);
            if (!existing) {
                throw new Error(`Exchange rate ${from}/${to} not found`);
            }

            const result = this.delete(existing.id);
            logger.info(`Deleted exchange rate ${from}/${to}`);
            return result;
        } catch (error) {
            logger.error(`Failed to delete exchange rate ${fromCurrency}/${toCurrency}:`, error.message);
            throw error;
        }
    }

    /**
     * 计算货币转换
     * @param {number} amount - 金额
     * @param {string} fromCurrency - 源货币
     * @param {string} toCurrency - 目标货币
     * @returns {Object} 转换结果
     */
    async convertCurrency(amount, fromCurrency, toCurrency) {
        try {
            const from = fromCurrency.toUpperCase();
            const to = toCurrency.toUpperCase();

            // 如果是相同货币，直接返回
            if (from === to) {
                return {
                    originalAmount: amount,
                    convertedAmount: amount,
                    fromCurrency: from,
                    toCurrency: to,
                    rate: 1,
                    timestamp: new Date().toISOString()
                };
            }

            // 获取汇率
            const exchangeRate = await this.getExchangeRate(from, to);
            if (!exchangeRate) {
                throw new Error(`Exchange rate not found for ${from}/${to}`);
            }

            const convertedAmount = amount * exchangeRate.rate;

            return {
                originalAmount: amount,
                convertedAmount: Math.round(convertedAmount * 100) / 100, // 保留两位小数
                fromCurrency: from,
                toCurrency: to,
                rate: exchangeRate.rate,
                timestamp: new Date().toISOString(),
                rateUpdatedAt: exchangeRate.updated_at
            };
        } catch (error) {
            logger.error(`Failed to convert currency ${amount} ${fromCurrency} to ${toCurrency}:`, error.message);
            throw error;
        }
    }

    /**
     * 获取汇率统计信息
     * @returns {Object} 统计信息
     */
    async getExchangeRateStats() {
        try {
            const allRates = await this.getAllExchangeRates();
            
            const currencies = new Set();
            const sources = {};
            let oldestUpdate = null;
            let newestUpdate = null;

            allRates.forEach(rate => {
                currencies.add(rate.from_currency);
                currencies.add(rate.to_currency);

                if (!sources[rate.source]) {
                    sources[rate.source] = 0;
                }
                sources[rate.source]++;

                const updateTime = new Date(rate.updated_at);
                if (!oldestUpdate || updateTime < oldestUpdate) {
                    oldestUpdate = updateTime;
                }
                if (!newestUpdate || updateTime > newestUpdate) {
                    newestUpdate = updateTime;
                }
            });

            return {
                totalRates: allRates.length,
                uniqueCurrencies: currencies.size,
                currencies: Array.from(currencies).sort(),
                sources,
                oldestUpdate: oldestUpdate ? oldestUpdate.toISOString() : null,
                newestUpdate: newestUpdate ? newestUpdate.toISOString() : null
            };
        } catch (error) {
            logger.error('Failed to get exchange rate stats:', error.message);
            throw error;
        }
    }

    /**
     * 验证汇率数据
     * @private
     * @param {string} fromCurrency - 源货币
     * @param {string} toCurrency - 目标货币
     * @param {number} rate - 汇率
     */
    _validateExchangeRateData(fromCurrency, toCurrency, rate) {
        if (!fromCurrency || typeof fromCurrency !== 'string' || fromCurrency.length !== 3) {
            throw new Error('Invalid from_currency: must be a 3-character currency code');
        }

        if (!toCurrency || typeof toCurrency !== 'string' || toCurrency.length !== 3) {
            throw new Error('Invalid to_currency: must be a 3-character currency code');
        }

        if (fromCurrency === toCurrency) {
            throw new Error('from_currency and to_currency cannot be the same');
        }

        const rateNum = parseFloat(rate);
        if (isNaN(rateNum) || rateNum <= 0) {
            throw new Error('Invalid rate: must be a positive number');
        }
    }
}

module.exports = ExchangeRateDbService;
