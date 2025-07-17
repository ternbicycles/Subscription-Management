const BaseRepository = require('../utils/BaseRepository');
const { asyncHandler } = require('../middleware/errorHandler');
const { handleQueryResult, handleDbResult, validationError } = require('../utils/responseHelper');
const { createValidator } = require('../utils/validator');

class PaymentMethodsController {
    constructor(db) {
        this.paymentMethodsRepo = new BaseRepository(db, 'payment_methods');
    }

    /**
     * 获取所有支付方式
     */
    getAllPaymentMethods = asyncHandler(async (req, res) => {
        const paymentMethods = this.paymentMethodsRepo.findAll({ orderBy: 'label ASC' });
        handleQueryResult(res, paymentMethods, 'Payment methods');
    });

    /**
     * 创建新支付方式
     */
    createPaymentMethod = asyncHandler(async (req, res) => {
        const { value, label } = req.body;

        // 验证数据
        const validator = createValidator();
        validator
            .required(value, 'value')
            .string(value, 'value')
            .length(value, 'value', 1, 50)
            .required(label, 'label')
            .string(label, 'label')
            .length(label, 'label', 1, 100);

        if (validator.hasErrors()) {
            return validationError(res, validator.getErrors());
        }

        // 检查是否已存在
        if (this.paymentMethodsRepo.exists({ value })) {
            return validationError(res, 'Payment method with this value already exists');
        }

        const result = this.paymentMethodsRepo.create({ value, label });
        handleDbResult(res, result, 'create', 'Payment method');
    });

    /**
     * 更新支付方式
     */
    updatePaymentMethod = asyncHandler(async (req, res) => {
        const { value } = req.params;
        const { label } = req.body;

        // 验证数据
        const validator = createValidator();
        validator
            .required(label, 'label')
            .string(label, 'label')
            .length(label, 'label', 1, 100);

        if (validator.hasErrors()) {
            return validationError(res, validator.getErrors());
        }

        const result = this.paymentMethodsRepo.updateWhere({ value }, { label });
        handleDbResult(res, result, 'update', 'Payment method');
    });

    /**
     * 删除支付方式
     */
    deletePaymentMethod = asyncHandler(async (req, res) => {
        const { value } = req.params;
        const result = this.paymentMethodsRepo.deleteWhere({ value });
        handleDbResult(res, result, 'delete', 'Payment method');
    });
}

module.exports = PaymentMethodsController;
