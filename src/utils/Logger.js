const moment = require('moment');

/**
 * Logger Module - Quản lý log cho Trading Bot
 * Hỗ trợ nhiều mức độ log và format đẹp mắt
 */

class Logger {
    static get LOG_LEVELS() {
        return {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3
        };
    }

    static get COLORS() {
        return {
            ERROR: '\x1b[31m', // Đỏ
            WARN: '\x1b[33m',  // Vàng
            INFO: '\x1b[36m',  // Cyan
            DEBUG: '\x1b[37m', // Trắng
            RESET: '\x1b[0m'
        };
    }

    static get currentLevel() {
        return this.LOG_LEVELS[process.env.LOG_LEVEL && process.env.LOG_LEVEL.toUpperCase()] || this.LOG_LEVELS.INFO;
    }

    static formatMessage(level, message, data = null) {
        const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
        const color = this.COLORS[level];
        const reset = this.COLORS.RESET;

        let formattedMessage = `${color}[${timestamp}] [${level}]${reset} ${message}`;

        if (data) {
            if (typeof data === 'object') {
                formattedMessage += `\n${JSON.stringify(data, null, 2)}`;
            } else {
                formattedMessage += ` ${data}`;
            }
        }

        return formattedMessage;
    }

    static log(level, message, data = null) {
        if (this.LOG_LEVELS[level] <= this.currentLevel) {
            console.log(this.formatMessage(level, message, data));
        }
    }

    static error(message, data = null) {
        this.log('ERROR', message, data);
    }

    static warn(message, data = null) {
        this.log('WARN', message, data);
    }

    static info(message, data = null) {
        this.log('INFO', message, data);
    }

    static debug(message, data = null) {
        this.log('DEBUG', message, data);
    }

    // Log đặc biệt cho trading
    static trade(action, symbol, price, amount, data = null) {
        const message = `🔄 ${action.toUpperCase()} ${amount} ${symbol} @ ${price}`;
        this.info(message, data);
    }

    static profit(amount, percentage, symbol = 'USDT') {
        const message = `💰 Lợi nhuận: +${amount} ${symbol} (+${percentage}%)`;
        this.info(message);
    }

    static loss(amount, percentage, symbol = 'USDT') {
        const message = `📉 Thua lỗ: -${amount} ${symbol} (-${percentage}%)`;
        this.warn(message);
    }

    static aiPrediction(prediction, confidence, data = null) {
        const message = `🤖 AI Dự đoán: ${prediction} (Độ tin cậy: ${(confidence * 100).toFixed(1)}%)`;
        this.info(message, data);
    }
}

module.exports = Logger;
