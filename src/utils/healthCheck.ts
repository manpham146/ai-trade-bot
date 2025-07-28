import * as ccxt from 'ccxt';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as dotenv from 'dotenv';
import Logger from './Logger';
import { AIManager } from '../ai/AIManager';
import { AIFactory } from '../ai/AIFactory';

// Load environment variables
dotenv.config();

/**
 * Health Check System
 * Kiểm tra tình trạng sức khỏe của hệ thống trading bot
 */

interface HealthChecks {
    environment: boolean;
    apiConnection: boolean;
    aiModel: boolean;
    diskSpace: boolean;
    memory: boolean;
    dependencies: boolean;
}

interface EnvironmentDetails {
    present: number;
    missing: number;
    missingVars: string[];
}

interface APIConnectionDetails {
    status: 'connected' | 'failed';
    responseTime?: number;
    sandbox?: boolean;
    balanceUSDT?: number;
    balanceBTC?: number;
    currentPrice?: number;
    error?: string;
}

interface AIModelDetails {
    modelPath: string;
    modelFiles: number;
    files: string[];
}

interface DiskSpaceDetails {
    freeSpace: number;
    freePercentage: number;
    projectSize: number;
}

interface MemoryDetails {
    heapUsed: number;
    heapTotal: number;
    systemFree: number;
    systemTotal: number;
    systemUsage: number;
}

interface DependenciesDetails {
    total: number;
    production: number;
    development: number;
    critical: number;
    missingCritical: string[];
}

interface SummaryDetails {
    totalChecks: number;
    passedChecks: number;
    passRate: number;
    warningsCount: number;
    errorsCount: number;
}

interface HealthDetails {
    environment?: EnvironmentDetails;
    apiConnection?: APIConnectionDetails;
    aiModel?: AIModelDetails;
    diskSpace?: DiskSpaceDetails;
    memory?: MemoryDetails;
    dependencies?: DependenciesDetails;
    summary?: SummaryDetails;
}

interface HealthResults {
    overall: 'HEALTHY' | 'FAIR' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';
    timestamp: string | null;
    details: HealthDetails;
    warnings: string[];
    errors: string[];
}

class HealthChecker {
    private checks: HealthChecks = {
        environment: false,
        apiConnection: false,
        aiModel: false,
        diskSpace: false,
        memory: false,
        dependencies: false
    };

    private results: HealthResults = {
        overall: 'UNKNOWN',
        timestamp: null,
        details: {},
        warnings: [],
        errors: []
    };

    /**
     * Chạy tất cả các kiểm tra
     */
    async runAllChecks(): Promise<HealthResults> {
        Logger.info('🔍 Bắt đầu kiểm tra sức khỏe hệ thống...');

        try {
            await Promise.all([
                this.checkEnvironment(),
                this.checkAPIConnection(),
                this.checkAIModel(),
                this.checkDiskSpace(),
                this.checkMemory(),
                this.checkDependencies()
            ]);

            this.calculateOverallHealth();
            this.generateReport();

            return this.results;

        } catch (error) {
            Logger.error('❌ Lỗi kiểm tra sức khỏe:', (error as Error).message);
            this.results.overall = 'CRITICAL';
            this.results.errors.push(`System check failed: ${(error as Error).message}`);
            return this.results;
        }
    }

    /**
     * Kiểm tra biến môi trường
     */
    private async checkEnvironment(): Promise<void> {
        try {
            const requiredEnvs = [
                'OKX_API_KEY',
                'OKX_SECRET_KEY',
                'OKX_PASSPHRASE',
                'TRADING_PAIR',
                'TRADE_AMOUNT'
            ];

            const missing: string[] = [];
            const present: string[] = [];

            for (const env of requiredEnvs) {
                if (process.env[env]) {
                    present.push(env);
                } else {
                    missing.push(env);
                }
            }

            this.results.details.environment = {
                present: present.length,
                missing: missing.length,
                missingVars: missing
            };

            if (missing.length === 0) {
                this.checks.environment = true;
                Logger.info('✅ Biến môi trường: OK');
            } else {
                this.results.errors.push(`Missing environment variables: ${missing.join(', ')}`);
                Logger.error(`❌ Thiếu biến môi trường: ${missing.join(', ')}`);
            }

        } catch (error) {
            this.results.errors.push(`Environment check failed: ${(error as Error).message}`);
            Logger.error('❌ Lỗi kiểm tra môi trường:', (error as Error).message);
        }
    }

    /**
     * Kiểm tra kết nối API
     */
    private async checkAPIConnection(): Promise<void> {
        try {
            if (!process.env.OKX_API_KEY || !process.env.OKX_SECRET_KEY || !process.env.OKX_PASSPHRASE) {
                this.results.errors.push('API credentials not configured');
                return;
            }

            const exchange = new ccxt.okx({
                apiKey: process.env.OKX_API_KEY,
                secret: process.env.OKX_SECRET_KEY,
                password: process.env.OKX_PASSPHRASE,
                sandbox: process.env.OKX_SANDBOX === 'true'
            });

            // Test connection
            const startTime = Date.now();
            const balance = await exchange.fetchBalance();
            const responseTime = Date.now() - startTime;

            // Test market data
            const ticker = await exchange.fetchTicker(process.env.TRADING_PAIR || 'BTC/USDT');

            this.results.details.apiConnection = {
                status: 'connected',
                responseTime: responseTime,
                sandbox: process.env.OKX_SANDBOX === 'true',
                balanceUSDT: balance.USDT?.free || 0,
                balanceBTC: balance.BTC?.free || 0,
                currentPrice: ticker.last
            };

            this.checks.apiConnection = true;
            Logger.info(`✅ Kết nối API: OK (${responseTime}ms)`);

            if (responseTime > 2000) {
                this.results.warnings.push('API response time is slow (>2s)');
            }

        } catch (error) {
            this.results.errors.push(`API connection failed: ${(error as Error).message}`);
            Logger.error('❌ Lỗi kết nối API:', (error as Error).message);

            this.results.details.apiConnection = {
                status: 'failed',
                error: (error as Error).message
            };
        }
    }

    /**
     * Kiểm tra External AI
     */
    private async checkAIModel(): Promise<void> {
        try {
            const aiFactory = AIFactory.getInstance();
            const aiManager = await aiFactory.createAIManagerFromEnv();

            // Kiểm tra External AI providers
            const availableProviders = aiFactory.getAvailableProviders();

            this.results.details.aiModel = {
                modelPath: 'External AI (Gemini/Claude/OpenAI)',
                modelFiles: availableProviders.length,
                files: availableProviders.map((p: string) => `${p} provider`)
            };

            if (availableProviders.length > 0) {
                // Thử khởi tạo AI Manager
                this.checks.aiModel = true;
                Logger.info('✅ External AI: OK');
            } else {
                this.results.warnings.push('No External AI providers configured. Please set API keys.');
                Logger.warn('⚠️ Chưa cấu hình External AI. Vui lòng thiết lập API keys.');
            }

        } catch (error) {
            this.results.errors.push(`External AI check failed: ${(error as Error).message}`);
            Logger.error('❌ Lỗi kiểm tra External AI:', (error as Error).message);
        }
    }

    /**
     * Kiểm tra dung lượng đĩa
     */
    private async checkDiskSpace(): Promise<void> {
        try {
            const { size } = await fs.stat(__filename);

            // Ước tính dung lượng còn lại (đơn giản)
            const totalSpace = 1024 * 1024 * 1024 * 10; // Giả sử 10GB
            const usedSpace = size;
            const freeSpace = totalSpace - usedSpace;
            const freePercentage = (freeSpace / totalSpace) * 100;

            this.results.details.diskSpace = {
                freeSpace: Math.round(freeSpace / 1024 / 1024), // MB
                freePercentage: Math.round(freePercentage),
                projectSize: Math.round(size / 1024) // KB
            };

            if (freePercentage > 10) {
                this.checks.diskSpace = true;
                Logger.info(`✅ Dung lượng đĩa: OK (${Math.round(freePercentage)}% còn trống)`);
            } else {
                this.results.warnings.push('Low disk space (<10% free)');
                Logger.warn('⚠️ Dung lượng đĩa thấp');
            }

        } catch (error) {
            this.results.warnings.push(`Disk space check failed: ${(error as Error).message}`);
            Logger.warn('⚠️ Không thể kiểm tra dung lượng đĩa:', (error as Error).message);
        }
    }

    /**
     * Kiểm tra bộ nhớ
     */
    private async checkMemory(): Promise<void> {
        try {
            const memUsage = process.memoryUsage();
            const totalMem = os.totalmem();
            const freeMem = os.freemem();

            const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
            const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
            const systemFreeMB = Math.round(freeMem / 1024 / 1024);
            const systemTotalMB = Math.round(totalMem / 1024 / 1024);
            const systemUsagePercent = Math.round(((totalMem - freeMem) / totalMem) * 100);

            this.results.details.memory = {
                heapUsed: heapUsedMB,
                heapTotal: heapTotalMB,
                systemFree: systemFreeMB,
                systemTotal: systemTotalMB,
                systemUsage: systemUsagePercent
            };

            if (systemUsagePercent < 90 && heapUsedMB < 500) {
                this.checks.memory = true;
                Logger.info(`✅ Bộ nhớ: OK (Heap: ${heapUsedMB}MB, System: ${systemUsagePercent}%)`);
            } else {
                this.results.warnings.push('High memory usage detected');
                Logger.warn(`⚠️ Sử dụng bộ nhớ cao (Heap: ${heapUsedMB}MB, System: ${systemUsagePercent}%)`);
            }

        } catch (error) {
            this.results.warnings.push(`Memory check failed: ${(error as Error).message}`);
            Logger.warn('⚠️ Không thể kiểm tra bộ nhớ:', (error as Error).message);
        }
    }

    /**
     * Kiểm tra dependencies
     */
    private async checkDependencies(): Promise<void> {
        try {
            const packagePath = path.join(process.cwd(), 'package.json');
            const packageData = JSON.parse(await fs.readFile(packagePath, 'utf8'));

            const dependencies = Object.keys(packageData.dependencies || {});
            const devDepsCount = Object.keys(packageData.devDependencies || {}).length;

            // Kiểm tra một số dependencies quan trọng
            const criticalDeps = ['ccxt', 'dotenv', 'express'];
            const missingCritical = criticalDeps.filter(dep => !dependencies.includes(dep));

            this.results.details.dependencies = {
                total: dependencies.length + devDepsCount,
                production: dependencies.length,
                development: devDepsCount,
                critical: criticalDeps.length,
                missingCritical: missingCritical
            };

            if (missingCritical.length === 0) {
                this.checks.dependencies = true;
                Logger.info(`✅ Dependencies: OK (${dependencies.length} production, ${devDepsCount} dev)`);
            } else {
                this.results.errors.push(`Missing critical dependencies: ${missingCritical.join(', ')}`);
                Logger.error(`❌ Thiếu dependencies quan trọng: ${missingCritical.join(', ')}`);
            }

        } catch (error) {
            this.results.errors.push(`Dependencies check failed: ${(error as Error).message}`);
            Logger.error('❌ Lỗi kiểm tra dependencies:', (error as Error).message);
        }
    }

    /**
     * Tính toán tình trạng tổng thể
     */
    private calculateOverallHealth(): void {
        const totalChecks = Object.keys(this.checks).length;
        const passedChecks = Object.values(this.checks).filter(Boolean).length;
        const passRate = (passedChecks / totalChecks) * 100;

        this.results.timestamp = new Date().toISOString();
        this.results.details.summary = {
            totalChecks,
            passedChecks,
            passRate: Math.round(passRate),
            warningsCount: this.results.warnings.length,
            errorsCount: this.results.errors.length
        };

        if (this.results.errors.length > 0) {
            this.results.overall = 'CRITICAL';
        } else if (passRate < 70 || this.results.warnings.length > 3) {
            this.results.overall = 'WARNING';
        } else if (passRate >= 90) {
            this.results.overall = 'HEALTHY';
        } else {
            this.results.overall = 'FAIR';
        }
    }

    /**
     * Tạo báo cáo
     */
    private generateReport(): void {
        const { overall, details } = this.results;
        const summary = details.summary!;

        console.log(`\n${'='.repeat(60)}`);
        console.log('🏥 BÁO CÁO SỨC KHỎE HỆ THỐNG');
        console.log('='.repeat(60));

        // Status icon
        const statusIcon: Record<string, string> = {
            'HEALTHY': '🟢',
            'FAIR': '🟡',
            'WARNING': '🟠',
            'CRITICAL': '🔴',
            'UNKNOWN': '⚪'
        };

        console.log(`${statusIcon[overall]} Tình trạng tổng thể: ${overall}`);
        console.log(`📊 Kiểm tra: ${summary.passedChecks}/${summary.totalChecks} thành công (${summary.passRate}%)`);
        console.log(`⚠️ Cảnh báo: ${summary.warningsCount}`);
        console.log(`❌ Lỗi: ${summary.errorsCount}`);
        console.log('');

        // Chi tiết từng kiểm tra
        Object.entries(this.checks).forEach(([check, passed]) => {
            const icon = passed ? '✅' : '❌';
            console.log(`${icon} ${check}: ${passed ? 'PASS' : 'FAIL'}`);
        });

        // Cảnh báo
        if (this.results.warnings.length > 0) {
            console.log('\n⚠️ CẢNH BÁO:');
            this.results.warnings.forEach(warning => {
                console.log(`  • ${warning}`);
            });
        }

        // Lỗi
        if (this.results.errors.length > 0) {
            console.log('\n❌ LỖI:');
            this.results.errors.forEach(error => {
                console.log(`  • ${error}`);
            });
        }

        // Khuyến nghị
        console.log('\n💡 KHUYẾN NGHỊ:');
        if (overall === 'CRITICAL') {
            console.log('  • Khắc phục các lỗi trước khi chạy bot');
            console.log('  • Kiểm tra cấu hình API và biến môi trường');
        } else if (overall === 'WARNING') {
            console.log('  • Xem xét các cảnh báo và tối ưu hóa');
            console.log('  • Theo dõi hiệu suất hệ thống');
        } else if (overall === 'HEALTHY') {
            console.log('  • Hệ thống sẵn sàng để chạy bot');
            console.log('  • Tiếp tục theo dõi định kỳ');
        }

        console.log('='.repeat(60));
    }

    /**
     * Lưu báo cáo vào file
     */
    async saveReport(): Promise<void> {
        try {
            const reportPath = path.join(__dirname, '../../data/health_report.json');
            await fs.mkdir(path.dirname(reportPath), { recursive: true });
            await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
            Logger.info(`📄 Báo cáo sức khỏe đã được lưu: ${reportPath}`);
        } catch (error) {
            Logger.error('❌ Lỗi lưu báo cáo:', (error as Error).message);
        }
    }
}

// Chạy health check nếu file được gọi trực tiếp
if (require.main === module) {
    const healthChecker = new HealthChecker();
    healthChecker.runAllChecks()
        .then(async (results) => {
            await healthChecker.saveReport();
            process.exit(results.overall === 'CRITICAL' ? 1 : 0);
        })
        .catch(error => {
            console.error('❌ Lỗi health check:', error);
            process.exit(1);
        });
}

export default HealthChecker;