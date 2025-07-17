const BaseRepository = require('../utils/BaseRepository');
const logger = require('../utils/logger');
const { SUPPORTED_CURRENCIES, isSupportedCurrency, getBaseCurrency } = require('../config/currencies');

/**
 * 设置服务类
 * 处理应用程序设置的业务逻辑
 */
class SettingsService extends BaseRepository {
    constructor(db) {
        super(db, 'settings');
    }

    /**
     * 获取应用设置
     * @returns {Object} 设置数据
     */
    async getSettings() {
        try {
            const settings = this.findById(1);
            return settings || this._getDefaultSettings();
        } catch (error) {
            logger.error('Failed to get settings:', error.message);
            throw error;
        }
    }

    /**
     * 更新应用设置
     * @param {Object} updateData - 要更新的设置数据
     * @param {string} updateData.currency - 货币设置
     * @param {string} updateData.theme - 主题设置
     * @returns {Object} 更新结果
     */
    async updateSettings(updateData) {
        try {
            // 验证更新数据
            this._validateUpdateData(updateData);

            // 准备更新数据
            const updates = {};
            if (updateData.currency) {
                updates.currency = updateData.currency;
            }
            if (updateData.theme) {
                updates.theme = updateData.theme;
            }
            if (updateData.show_original_currency !== undefined) {
                updates.show_original_currency = updateData.show_original_currency;
            }

            if (Object.keys(updates).length === 0) {
                throw new Error('No update fields provided');
            }

            // 添加更新时间戳
            updates.updated_at = new Date().toISOString();

            // 执行更新
            const result = this.update(1, updates);

            if (result.changes === 0) {
                // 如果没有找到记录，创建默认设置
                const defaultSettings = this._getDefaultSettings();
                const createData = { ...defaultSettings, ...updates, id: 1 };
                return this.create(createData);
            }

            return result;
        } catch (error) {
            logger.error('Failed to update settings:', error.message);
            throw error;
        }
    }

    /**
     * 重置设置为默认值
     * @returns {Object} 重置结果
     */
    async resetSettings() {
        try {
            // 删除现有设置
            this.delete(1);

            // 创建默认设置
            const defaultSettings = this._getDefaultSettings();
            const result = this.create({ ...defaultSettings, id: 1 });

            logger.info('Settings reset to default values');
            return result;
        } catch (error) {
            logger.error('Failed to reset settings:', error.message);
            throw error;
        }
    }

    /**
     * 验证货币代码
     * @param {string} currency - 货币代码
     * @returns {boolean} 是否有效
     */
    validateCurrency(currency) {
        return isSupportedCurrency(currency);
    }

    /**
     * 验证主题设置
     * @param {string} theme - 主题设置
     * @returns {boolean} 是否有效
     */
    validateTheme(theme) {
        const validThemes = ['light', 'dark', 'system'];
        return validThemes.includes(theme);
    }

    /**
     * 验证显示原始货币设置
     * @param {boolean|number} showOriginalCurrency - 显示原始货币设置
     * @returns {boolean} 是否有效
     */
    validateShowOriginalCurrency(showOriginalCurrency) {
        return typeof showOriginalCurrency === 'boolean' ||
               showOriginalCurrency === 0 ||
               showOriginalCurrency === 1;
    }

    /**
     * 获取默认设置
     * @private
     * @returns {Object} 默认设置
     */
    _getDefaultSettings() {
        return {
            currency: getBaseCurrency(),
            theme: 'system',
            show_original_currency: 1, // Use integer instead of boolean for SQLite
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
    }

    /**
     * 验证更新数据
     * @private
     * @param {Object} updateData - 更新数据
     */
    _validateUpdateData(updateData) {
        if (updateData.currency && !this.validateCurrency(updateData.currency)) {
            throw new Error(`Invalid currency: ${updateData.currency}`);
        }

        if (updateData.theme && !this.validateTheme(updateData.theme)) {
            throw new Error(`Invalid theme: ${updateData.theme}`);
        }

        if (updateData.show_original_currency !== undefined && !this.validateShowOriginalCurrency(updateData.show_original_currency)) {
            throw new Error(`Invalid show_original_currency value: ${updateData.show_original_currency}`);
        }
    }

    /**
     * 获取支持的货币列表
     * @returns {Array} 货币列表
     */
    getSupportedCurrencies() {
        return SUPPORTED_CURRENCIES;
    }

    /**
     * 获取支持的主题列表
     * @returns {Array} 主题列表
     */
    getSupportedThemes() {
        return [
            { value: 'light', label: 'Light Theme', description: 'Light color scheme' },
            { value: 'dark', label: 'Dark Theme', description: 'Dark color scheme' },
            { value: 'system', label: 'System Default', description: 'Follow system preference' }
        ];
    }
}

module.exports = SettingsService;
