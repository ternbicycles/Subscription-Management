const config = require('../config');

/**
 * 服务器端日志工具
 * 根据环境变量控制日志输出级别
 */

class Logger {
    constructor() {
        this.isDevelopment = config.isDevelopment();
        this.logLevel = config.getLogLevel();
    }

    shouldLog(level) {
        if (!this.isDevelopment && level === 'debug') {
            return false;
        }

        const levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };

        return levels[level] >= levels[this.logLevel];
    }

    debug(message, ...args) {
        if (this.shouldLog('debug')) {
            console.log(`[DEBUG] ${message}`, ...args);
        }
    }

    info(message, ...args) {
        if (this.shouldLog('info')) {
            console.log(`[INFO] ${message}`, ...args);
        }
    }

    warn(message, ...args) {
        if (this.shouldLog('warn')) {
            console.warn(`[WARN] ${message}`, ...args);
        }
    }

    error(message, ...args) {
        if (this.shouldLog('error')) {
            console.error(`[ERROR] ${message}`, ...args);
        }
    }
}

module.exports = new Logger();
