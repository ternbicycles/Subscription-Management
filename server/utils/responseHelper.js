const config = require('../config');

/**
 * 统一响应处理工具
 * 提供标准化的API响应格式
 */

/**
 * 成功响应
 * @param {Object} res - Express响应对象
 * @param {*} data - 响应数据
 * @param {string} message - 响应消息
 * @param {number} statusCode - HTTP状态码
 */
function success(res, data = null, message = 'Success', statusCode = 200) {
    const response = {
        success: true,
        message,
        data
    };
    
    return res.status(statusCode).json(response);
}

/**
 * 创建成功响应
 * @param {Object} res - Express响应对象
 * @param {*} data - 响应数据
 * @param {string} message - 响应消息
 */
function created(res, data = null, message = 'Created successfully') {
    return success(res, data, message, 201);
}

/**
 * 更新成功响应
 * @param {Object} res - Express响应对象
 * @param {*} data - 响应数据
 * @param {string} message - 响应消息
 */
function updated(res, data = null, message = 'Updated successfully') {
    return success(res, data, message, 200);
}

/**
 * 删除成功响应
 * @param {Object} res - Express响应对象
 * @param {string} message - 响应消息
 */
function deleted(res, message = 'Deleted successfully') {
    return success(res, null, message, 200);
}

/**
 * 分页响应
 * @param {Object} res - Express响应对象
 * @param {Array} data - 响应数据
 * @param {Object} pagination - 分页信息
 * @param {string} message - 响应消息
 */
function paginated(res, data, pagination, message = 'Success') {
    const response = {
        success: true,
        message,
        data,
        pagination: {
            total: pagination.total || 0,
            page: pagination.page || 1,
            limit: pagination.limit || 10,
            totalPages: Math.ceil((pagination.total || 0) / (pagination.limit || 10))
        }
    };
    
    return res.status(200).json(response);
}

/**
 * 错误响应
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 * @param {number} statusCode - HTTP状态码
 * @param {*} details - 错误详情
 */
function error(res, message = 'Internal Server Error', statusCode = 500, details = null) {
    const response = {
        success: false,
        message,
        error: true
    };
    
    if (details && config.isDevelopment()) {
        response.details = details;
    }
    
    return res.status(statusCode).json(response);
}

/**
 * 验证错误响应
 * @param {Object} res - Express响应对象
 * @param {string|Array} errors - 验证错误信息
 */
function validationError(res, errors) {
    const response = {
        success: false,
        message: 'Validation failed',
        error: true,
        errors: Array.isArray(errors) ? errors : [errors]
    };
    
    return res.status(400).json(response);
}

/**
 * 未找到响应
 * @param {Object} res - Express响应对象
 * @param {string} resource - 资源名称
 */
function notFound(res, resource = 'Resource') {
    return error(res, `${resource} not found`, 404);
}

/**
 * 未授权响应
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 */
function unauthorized(res, message = 'Unauthorized access') {
    return error(res, message, 401);
}

/**
 * 禁止访问响应
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 */
function forbidden(res, message = 'Forbidden access') {
    return error(res, message, 403);
}

/**
 * 冲突响应
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 */
function conflict(res, message = 'Resource conflict') {
    return error(res, message, 409);
}

/**
 * 处理数据库操作结果
 * @param {Object} res - Express响应对象
 * @param {Object} result - 数据库操作结果
 * @param {string} operation - 操作类型 ('create', 'update', 'delete')
 * @param {string} resource - 资源名称
 */
function handleDbResult(res, result, operation, resource = 'Resource') {
    if (!result) {
        return notFound(res, resource);
    }
    
    switch (operation) {
        case 'create':
            return created(res, { id: result.lastInsertRowid }, `${resource} created successfully`);
        case 'update':
            if (result.changes === 0) {
                return notFound(res, resource);
            }
            return updated(res, null, `${resource} updated successfully`);
        case 'delete':
            if (result.changes === 0) {
                return notFound(res, resource);
            }
            return deleted(res, `${resource} deleted successfully`);
        default:
            return success(res, result);
    }
}

/**
 * 处理查询结果
 * @param {Object} res - Express响应对象
 * @param {*} data - 查询结果
 * @param {string} resource - 资源名称
 */
function handleQueryResult(res, data, resource = 'Resource') {
    if (Array.isArray(data)) {
        return success(res, data, `${resource} retrieved successfully`);
    } else if (data) {
        return success(res, data, `${resource} retrieved successfully`);
    } else {
        return notFound(res, resource);
    }
}

module.exports = {
    success,
    created,
    updated,
    deleted,
    paginated,
    error,
    validationError,
    notFound,
    unauthorized,
    forbidden,
    conflict,
    handleDbResult,
    handleQueryResult
};
