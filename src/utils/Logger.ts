import moment from 'moment';

/**
 * Logger Module - Quản lý log cho Trading Bot
 * Hỗ trợ nhiều mức độ log và format đẹp mắt
 */

type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
type LogData = string | number | object | null;

interface LogLevels {
    ERROR: number;
    WARN: number;
    INFO: number;
    DEBUG: number;
}

interface Colors {
    ERROR: string;
    WARN: string;
    INFO: string;
    DEBUG: string;
    RESET: string;
}

class Logger {
    static get LOG_LEVELS(): LogLevels {
        return {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3
        };
    }

    static get COLORS(): Colors {
        return {
            ERROR: '\x1b[31m', // Đỏ
            WARN: '\x1b[33m',  // Vàng
            INFO: '\x1b[36m',  // Cyan
            DEBUG: '\x1b[37m', // Trắng
            RESET: '\x1b[0m'
        };
    }

    static get currentLevel(): number {
        const envLevel = process.env.LOG_LEVEL?.toUpperCase() as keyof LogLevels;
        return this.LOG_LEVELS[envLevel] ?? this.LOG_LEVELS.INFO;
    }

    static formatMessage(level: LogLevel, message: string, data: LogData = null): string {
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

    static log(level: LogLevel, message: string, data: LogData = null): void {
        const levelValue = this.LOG_LEVELS[level];
        if (levelValue <= this.currentLevel) {
            console.log(this.formatMessage(level, message, data));
        }
    }

    static error(message: string, data: LogData = null): void {
        this.log('ERROR', message, data);
    }

    static warn(message: string, data: LogData = null): void {
        this.log('WARN', message, data);
    }

    static info(message: string, data: LogData = null): void {
        this.log('INFO', message, data);
    }

    static debug(message: string, data: LogData = null): void {
        this.log('DEBUG', message, data);
    }

    // Specialized logging methods for trading
    static trade(action: string, symbol: string, price: number, amount: number, data: LogData = null): void {
        this.info(`📈 ${action.toUpperCase()} ${symbol} - Price: ${price}, Amount: ${amount}`, data);
    }

    static profit(amount: number, percentage: number, symbol: string = 'USDT'): void {
        this.info(`💰 PROFIT: +${amount} ${symbol} (+${percentage.toFixed(2)}%)`);
    }

    static loss(amount: number, percentage: number, symbol: string = 'USDT'): void {
        this.warn(`📉 LOSS: -${amount} ${symbol} (-${percentage.toFixed(2)}%)`);
    }

    static aiPrediction(prediction: string, confidence: number, data: LogData = null): void {
        this.info(`🤖 AI Prediction: ${prediction} (Confidence: ${(confidence * 100).toFixed(1)}%)`, data);
    }
}

export default Logger;