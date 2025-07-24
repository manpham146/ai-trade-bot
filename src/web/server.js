const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const Logger = require('../utils/Logger');

/**
 * Web Dashboard Server
 * Cung cấp giao diện web để theo dõi bot trading
 */
class WebDashboard {
    constructor() {
        this.app = express();
        this.port = process.env.WEB_PORT || 3000;
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        // Security middleware
        this.app.use(helmet());
        this.app.use(compression());
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static(path.join(__dirname, 'public')));
    }

    setupRoutes() {
        // Dashboard chính
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });

        // API endpoints
        this.app.get('/api/status', this.getStatus.bind(this));
        this.app.get('/api/stats', this.getStats.bind(this));
        this.app.get('/api/trades', this.getTrades.bind(this));
        this.app.get('/api/predictions', this.getPredictions.bind(this));
        this.app.get('/api/market-data', this.getMarketData.bind(this));

        // Control endpoints
        this.app.post('/api/start', this.startBot.bind(this));
        this.app.post('/api/stop', this.stopBot.bind(this));
        this.app.post('/api/emergency-stop', this.emergencyStop.bind(this));
    }

    async getStatus(req, res) {
        try {
            const status = {
                isRunning: global.botInstance?.isRunning || false,
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                lastUpdate: new Date().toISOString(),
                tradingEnabled: process.env.TRADING_ENABLED === 'true',
                sandbox: process.env.OKX_SANDBOX === 'true'
            };
            res.json(status);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getStats(req, res) {
        try {
            const stats = global.botInstance?.stats || {
                totalTrades: 0,
                winTrades: 0,
                lossTrades: 0,
                totalProfit: 0,
                winRate: 0,
                currentBalance: 0
            };
            res.json(stats);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getTrades(req, res) {
        try {
            // Đọc lịch sử giao dịch từ file
            const tradesFile = path.join(__dirname, '../../data/trades.json');
            let trades = [];

            if (fs.existsSync(tradesFile)) {
                const data = fs.readFileSync(tradesFile, 'utf8');
                trades = JSON.parse(data);
            }

            res.json(trades.slice(-50)); // Lấy 50 giao dịch gần nhất
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getPredictions(req, res) {
        try {
            // Đọc dự đoán AI từ cache
            const predictionsFile = path.join(__dirname, '../../data/predictions.json');
            let predictions = [];

            if (fs.existsSync(predictionsFile)) {
                const data = fs.readFileSync(predictionsFile, 'utf8');
                predictions = JSON.parse(data);
            }

            res.json(predictions.slice(-20)); // Lấy 20 dự đoán gần nhất
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getMarketData(req, res) {
        try {
            const marketData = global.botInstance?.lastMarketData || {};
            res.json(marketData);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async startBot(req, res) {
        try {
            if (global.botInstance && !global.botInstance.isRunning) {
                await global.botInstance.start();
                res.json({ success: true, message: 'Bot đã được khởi động' });
            } else {
                res.json({ success: false, message: 'Bot đã đang chạy' });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async stopBot(req, res) {
        try {
            if (global.botInstance && global.botInstance.isRunning) {
                await global.botInstance.stop();
                res.json({ success: true, message: 'Bot đã được dừng' });
            } else {
                res.json({ success: false, message: 'Bot không đang chạy' });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async emergencyStop(req, res) {
        try {
            if (global.botInstance) {
                global.botInstance.isRunning = false;
                Logger.warn('🚨 EMERGENCY STOP - Bot đã được dừng khẩn cấp!');
                res.json({ success: true, message: 'Bot đã được dừng khẩn cấp' });
            } else {
                res.json({ success: false, message: 'Không tìm thấy bot instance' });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    start() {
        this.app.listen(this.port, () => {
            Logger.info(`🌐 Web Dashboard đang chạy tại http://localhost:${this.port}`);
        });
    }
}

// Khởi động server nếu file được chạy trực tiếp
if (require.main === module) {
    const dashboard = new WebDashboard();
    dashboard.start();
}

module.exports = WebDashboard;
