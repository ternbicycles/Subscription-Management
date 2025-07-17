const SettingsService = require('../services/settingsService');
const { asyncHandler } = require('../middleware/errorHandler');
const { handleQueryResult, handleDbResult, validationError, success } = require('../utils/responseHelper');
const { createValidator } = require('../utils/validator');

/**
 * 设置控制器
 * 处理应用设置相关的HTTP请求
 */
class SettingsController {
    constructor(db) {
        this.settingsService = new SettingsService(db);
    }

    /**
     * 获取应用设置
     */
    getSettings = asyncHandler(async (req, res) => {
        const settings = await this.settingsService.getSettings();
        handleQueryResult(res, settings, 'Settings');
    });

    /**
     * 更新应用设置
     */
    updateSettings = asyncHandler(async (req, res) => {
        const { currency, theme, showOriginalCurrency } = req.body;

        // 验证更新数据
        const validator = createValidator();

        if (currency !== undefined) {
            validator
                .string(currency, 'currency')
                .length(currency, 'currency', 3, 3)
                .custom(currency, 'currency',
                    (value) => this.settingsService.validateCurrency(value),
                    'Invalid currency code'
                );
        }

        if (theme !== undefined) {
            validator
                .string(theme, 'theme')
                .custom(theme, 'theme',
                    (value) => this.settingsService.validateTheme(value),
                    'Invalid theme value'
                );
        }

        if (showOriginalCurrency !== undefined) {
            validator
                .custom(showOriginalCurrency, 'showOriginalCurrency',
                    (value) => this.settingsService.validateShowOriginalCurrency(value),
                    'Invalid showOriginalCurrency value'
                );
        }

        if (validator.hasErrors()) {
            return validationError(res, validator.getErrors());
        }

        // 检查是否有更新字段
        if (currency === undefined && theme === undefined && showOriginalCurrency === undefined) {
            return validationError(res, 'No update fields provided');
        }

        const updateData = {};
        if (currency !== undefined) updateData.currency = currency.toUpperCase();
        if (theme !== undefined) updateData.theme = theme;
        if (showOriginalCurrency !== undefined) updateData.show_original_currency = showOriginalCurrency ? 1 : 0;

        const result = await this.settingsService.updateSettings(updateData);
        handleDbResult(res, result, 'update', 'Settings');
    });

    /**
     * 重置设置为默认值
     */
    resetSettings = asyncHandler(async (req, res) => {
        const result = await this.settingsService.resetSettings();
        success(res, { id: result.lastInsertRowid }, 'Settings have been reset to default values');
    });

    /**
     * 获取支持的货币列表
     */
    getSupportedCurrencies = asyncHandler(async (req, res) => {
        const currencies = this.settingsService.getSupportedCurrencies();
        handleQueryResult(res, currencies, 'Supported currencies');
    });

    /**
     * 获取支持的主题列表
     */
    getSupportedThemes = asyncHandler(async (req, res) => {
        const themes = this.settingsService.getSupportedThemes();
        handleQueryResult(res, themes, 'Supported themes');
    });

    /**
     * 验证货币代码
     */
    validateCurrency = asyncHandler(async (req, res) => {
        const { currency } = req.params;

        const validator = createValidator();
        validator
            .required(currency, 'currency')
            .string(currency, 'currency')
            .length(currency, 'currency', 3, 3);

        if (validator.hasErrors()) {
            return validationError(res, validator.getErrors());
        }

        const isValid = this.settingsService.validateCurrency(currency);
        
        success(res, {
            currency: currency.toUpperCase(),
            isValid,
            message: isValid ? 'Currency is valid' : 'Currency is not supported'
        }, 'Currency validation completed');
    });

    /**
     * 验证主题设置
     */
    validateTheme = asyncHandler(async (req, res) => {
        const { theme } = req.params;

        const validator = createValidator();
        validator
            .required(theme, 'theme')
            .string(theme, 'theme');

        if (validator.hasErrors()) {
            return validationError(res, validator.getErrors());
        }

        const isValid = this.settingsService.validateTheme(theme);
        
        success(res, {
            theme,
            isValid,
            message: isValid ? 'Theme is valid' : 'Theme is not supported'
        }, 'Theme validation completed');
    });

    /**
     * 获取设置统计信息
     */
    getSettingsInfo = asyncHandler(async (req, res) => {
        const settings = await this.settingsService.getSettings();
        const supportedCurrencies = this.settingsService.getSupportedCurrencies();
        const supportedThemes = this.settingsService.getSupportedThemes();

        const info = {
            currentSettings: settings,
            supportedOptions: {
                currencies: supportedCurrencies.length,
                themes: supportedThemes.length
            },
            validation: {
                currencyValid: settings.currency ? this.settingsService.validateCurrency(settings.currency) : false,
                themeValid: settings.theme ? this.settingsService.validateTheme(settings.theme) : false
            },
            lastUpdated: settings.updated_at,
            created: settings.created_at
        };

        handleQueryResult(res, info, 'Settings information');
    });

    /**
     * 批量更新设置
     */
    bulkUpdateSettings = asyncHandler(async (req, res) => {
        const updates = req.body;

        if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
            return validationError(res, 'Request body must be an object with settings to update');
        }

        // 验证所有更新字段
        const validator = createValidator();
        const validFields = ['currency', 'theme', 'showOriginalCurrency'];
        const updateData = {};

        Object.entries(updates).forEach(([key, value]) => {
            if (!validFields.includes(key)) {
                validator.addError(key, `${key} is not a valid settings field`);
                return;
            }

            if (key === 'currency') {
                validator
                    .string(value, 'currency')
                    .length(value, 'currency', 3, 3)
                    .custom(value, 'currency',
                        (val) => this.settingsService.validateCurrency(val),
                        'Invalid currency code'
                    );
                if (!validator.hasErrors()) {
                    updateData.currency = value.toUpperCase();
                }
            }

            if (key === 'theme') {
                validator
                    .string(value, 'theme')
                    .custom(value, 'theme',
                        (val) => this.settingsService.validateTheme(val),
                        'Invalid theme value'
                    );
                if (!validator.hasErrors()) {
                    updateData.theme = value;
                }
            }

            if (key === 'showOriginalCurrency') {
                validator
                    .custom(value, 'showOriginalCurrency',
                        (val) => this.settingsService.validateShowOriginalCurrency(val),
                        'Invalid showOriginalCurrency value'
                    );
                if (!validator.hasErrors()) {
                    updateData.show_original_currency = value ? 1 : 0;
                }
            }
        });

        if (validator.hasErrors()) {
            return validationError(res, validator.getErrors());
        }

        if (Object.keys(updateData).length === 0) {
            return validationError(res, 'No valid update fields provided');
        }

        const result = await this.settingsService.updateSettings(updateData);
        
        success(res, {
            updatedFields: Object.keys(updateData),
            changes: result.changes
        }, 'Settings updated successfully');
    });
}

module.exports = SettingsController;
