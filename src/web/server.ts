import express, { Request, Response, Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import Logger from '../utils/Logger';

/**
 * Web Dashboard Server
 * Cung cấp giao diện web để theo dõi bot trading
 */

interface BotStatus {
    isRunning: boolean;
    uptime: number;
    memory: NodeJS.MemoryUsage;
    lastUpdate: string;
    tradingEnabled: boolean;
    sandbox: boolean;
}

interface BotStats {
    totalTrades: number;
    winTrades: number;
    lossTrades: number;
    totalProfit: number;
    winRate: number;
    currentBalance: number;
}

interface Trade {
    id?: string;
    symbol: string;
    side: 'buy' | 'sell';
    amount: number;
    price: number;
    timestamp: number;
    profit?: number;
    fee?: number;
}

interface Prediction {
    timestamp: number;
    signal: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    price: number;
    reasoning?: string[];
}

interface MarketData {
    symbol?: string;
    price?: number;
    volume?: number;
    timestamp?: number;
    ohlcv?: number[][];
    [key: string]: any;
}

interface BotInstance {
    isRunning: boolean;
    stats?: BotStats;
    lastMarketData?: MarketData;
    start(): Promise<void>;
    stop(): Promise<void>;
}

interface ApiResponse {
    success: boolean;
    message: string;
    error?: string;
}

// Extend global namespace to include botInstance
declare global {
    var botInstance: BotInstance | undefined;
}

class WebDashboard {
    private app: Application;
    private port: number;
    private projectRoot: string;

    constructor() {
        this.app = express();
        this.port = parseInt(process.env.WEB_PORT || '3000');
        this.projectRoot = path.resolve(__dirname, '../..');
        this.setupMiddleware();
        this.setupRoutes();
    }

    private setupMiddleware(): void {
        // Security middleware
        this.app.use(helmet());
        this.app.use(compression());
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static(path.join(__dirname, 'public')));
    }

    private setupRoutes(): void {
        // Dashboard chính
        this.app.get('/', (req: Request, res: Response) => {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });

        // API endpoints
        this.app.get('/api/status', this.getStatus.bind(this));
        this.app.get('/api/stats', this.getStats.bind(this));
        this.app.get('/api/trades', this.getTrades.bind(this));
        this.app.get('/api/predictions', this.getPredictions.bind(this));
        this.app.get('/api/market-data', this.getMarketData.bind(this));

        // File Management Routes
        this.app.get('/api/file/:filePath(*)', this.getFile.bind(this));
        this.app.post('/api/file/save', this.saveFile.bind(this));
        this.app.get('/api/files', this.getFileList.bind(this));

        // Control endpoints
        this.app.post('/api/start', this.startBot.bind(this));
        this.app.post('/api/stop', this.stopBot.bind(this));
        this.app.post('/api/emergency-stop', this.emergencyStop.bind(this));
    }

    private async getStatus(req: Request, res: Response): Promise<void> {
        try {
            const status: BotStatus = {
                isRunning: global.botInstance?.isRunning || false,
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                lastUpdate: new Date().toISOString(),
                tradingEnabled: process.env.TRADING_ENABLED === 'true',
                sandbox: process.env.OKX_SANDBOX === 'true'
            };
            res.json(status);
        } catch (error) {
            res.status(500).json({ error: (error as Error).message });
        }
    }

    private async getStats(req: Request, res: Response): Promise<void> {
        try {
            const stats: BotStats = global.botInstance?.stats || {
                totalTrades: 0,
                winTrades: 0,
                lossTrades: 0,
                totalProfit: 0,
                winRate: 0,
                currentBalance: 0
            };
            res.json(stats);
        } catch (error) {
            res.status(500).json({ error: (error as Error).message });
        }
    }

    private async getTrades(req: Request, res: Response): Promise<void> {
        try {
            // Đọc lịch sử giao dịch từ file
            const tradesFile = path.join(__dirname, '../../data/trades.json');
            let trades: Trade[] = [];

            if (fs.existsSync(tradesFile)) {
                const data = fs.readFileSync(tradesFile, 'utf8');
                trades = JSON.parse(data) as Trade[];
            }

            res.json(trades.slice(-50)); // Lấy 50 giao dịch gần nhất
        } catch (error) {
            res.status(500).json({ error: (error as Error).message });
        }
    }

    private async getPredictions(req: Request, res: Response): Promise<void> {
        try {
            // Đọc dự đoán AI từ cache
            const predictionsFile = path.join(__dirname, '../../data/predictions.json');
            let predictions: Prediction[] = [];

            if (fs.existsSync(predictionsFile)) {
                const data = fs.readFileSync(predictionsFile, 'utf8');
                predictions = JSON.parse(data) as Prediction[];
            }

            res.json(predictions.slice(-20)); // Lấy 20 dự đoán gần nhất
        } catch (error) {
            res.status(500).json({ error: (error as Error).message });
        }
    }

    private async getMarketData(req: Request, res: Response): Promise<void> {
        try {
            const marketData: MarketData = global.botInstance?.lastMarketData || {};
            res.json(marketData);
        } catch (error) {
            res.status(500).json({ error: (error as Error).message });
        }
    }

    private async startBot(req: Request, res: Response): Promise<void> {
        try {
            if (global.botInstance && !global.botInstance.isRunning) {
                await global.botInstance.start();
                const response: ApiResponse = { success: true, message: 'Bot đã được khởi động' };
                res.json(response);
            } else {
                const response: ApiResponse = { success: false, message: 'Bot đã đang chạy' };
                res.json(response);
            }
        } catch (error) {
            res.status(500).json({ error: (error as Error).message });
        }
    }

    private async stopBot(req: Request, res: Response): Promise<void> {
        try {
            if (global.botInstance && global.botInstance.isRunning) {
                await global.botInstance.stop();
                const response: ApiResponse = { success: true, message: 'Bot đã được dừng' };
                res.json(response);
            } else {
                const response: ApiResponse = { success: false, message: 'Bot không đang chạy' };
                res.json(response);
            }
        } catch (error) {
            res.status(500).json({ error: (error as Error).message });
        }
    }

    private async emergencyStop(req: Request, res: Response): Promise<void> {
        try {
            if (global.botInstance) {
                global.botInstance.isRunning = false;
                Logger.warn('🚨 EMERGENCY STOP - Bot đã được dừng khẩn cấp!');
                const response: ApiResponse = { success: true, message: 'Bot đã được dừng khẩn cấp' };
                res.json(response);
            } else {
                const response: ApiResponse = { success: false, message: 'Không tìm thấy bot instance' };
                res.json(response);
            }
        } catch (error) {
            res.status(500).json({ error: (error as Error).message });
        }
    }

    // File Management Methods
    private async getFile(req: Request, res: Response): Promise<void> {
        try {
            const filePath = req.params.filePath;
            const fullPath = path.resolve(this.projectRoot, filePath);

            // Security check: ensure file is within project directory
            if (!fullPath.startsWith(this.projectRoot)) {
                res.status(403).json({ error: 'Access denied' });
                return;
            }

            const content = await fsPromises.readFile(fullPath, 'utf-8');
            res.json({ content, filePath });
        } catch (error) {
            res.status(404).json({ error: 'File not found', message: (error as Error).message });
        }
    }

    private async saveFile(req: Request, res: Response): Promise<void> {
        try {
            const { filePath, content } = req.body;
            const fullPath = path.resolve(this.projectRoot, filePath);

            // Security check: ensure file is within project directory
            if (!fullPath.startsWith(this.projectRoot)) {
                res.status(403).json({ error: 'Access denied' });
                return;
            }

            // Create backup before saving
            try {
                const backupPath = fullPath + '.backup.' + Date.now();
                const originalContent = await fsPromises.readFile(fullPath, 'utf-8');
                await fsPromises.writeFile(backupPath, originalContent);
            } catch (error) {
                // File might not exist, continue
            }

            await fsPromises.writeFile(fullPath, content, 'utf-8');
            res.json({ success: true, message: 'File saved successfully' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to save file', message: (error as Error).message });
        }
    }

    private async getFileList(req: Request, res: Response): Promise<void> {
        try {
            const files = [
                'src/index.ts',
                'src/bot/TradingBot.ts',
                'src/ai/AIManager.ts',
                'src/bot/MarketAnalyzer.ts',
                'src/bot/RiskManager.ts',
                '.env.example',
                'package.json',
                'README.md'
            ];

            const fileList = [];
            for (const file of files) {
                try {
                    const fullPath = path.resolve(this.projectRoot, file);
                    const stats = await fsPromises.stat(fullPath);
                    fileList.push({
                        path: file,
                        name: path.basename(file),
                        size: stats.size,
                        modified: stats.mtime
                    });
                } catch (error) {
                    // File doesn't exist, skip
                }
            }

            res.json({ files: fileList });
        } catch (error) {
            res.status(500).json({ error: 'Failed to get file list', message: (error as Error).message });
        }
    }

    public start(): void {
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

export default WebDashboard;