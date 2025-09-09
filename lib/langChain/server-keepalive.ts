import { NextRequest, NextResponse } from 'next/server';

// Server keep-alive system to prevent cold starts
export class ServerKeepAlive {
  private static instance: ServerKeepAlive | null = null;
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private isActive = false;
  private readonly pingInterval = 14 * 60 * 1000; // 14 minutes (Render free tier sleeps after 15 min)
  private readonly maxRetries = 3;
  private retryCount = 0;

  private constructor() {}

  static getInstance(): ServerKeepAlive {
    if (!ServerKeepAlive.instance) {
      ServerKeepAlive.instance = new ServerKeepAlive();
    }
    return ServerKeepAlive.instance;
  }

  // Start keep-alive pings
  start(): void {
    if (this.isActive) {
      console.log('Keep-alive is already running');
      return;
    }

    this.isActive = true;
    console.log('Starting server keep-alive system...');

    // Initial ping after 1 minute
    setTimeout(() => {
      this.pingServer();
    }, 60000);

    // Set up regular pings
    this.keepAliveInterval = setInterval(() => {
      this.pingServer();
    }, this.pingInterval);
  }

  // Stop keep-alive pings
  stop(): void {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;
    console.log('Stopping server keep-alive system...');

    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  // Ping the server to keep it alive
  private async pingServer(): Promise<void> {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                     process.env.VERCEL_URL || 
                     'http://localhost:3000';
      
      const pingUrl = `${baseUrl}/api/health/ping`;
      
      console.log(`Pinging server: ${pingUrl}`);
      
      const response = await fetch(pingUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Studify-KeepAlive/1.0',
          'X-Keep-Alive': 'true'
        },
        // Short timeout to avoid hanging
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        console.log('Keep-alive ping successful');
        this.retryCount = 0; // Reset retry count on success
      } else {
        console.warn(`Keep-alive ping failed with status: ${response.status}`);
        this.handlePingFailure();
      }
    } catch (error) {
      console.error('Keep-alive ping error:', error);
      this.handlePingFailure();
    }
  }

  // Handle ping failures with retry logic
  private handlePingFailure(): void {
    this.retryCount++;
    
    if (this.retryCount >= this.maxRetries) {
      console.error(`Keep-alive failed ${this.maxRetries} times, stopping...`);
      this.stop();
      return;
    }

    // Retry after a short delay
    console.log(`Retrying keep-alive ping in 30 seconds (attempt ${this.retryCount}/${this.maxRetries})`);
    setTimeout(() => {
      this.pingServer();
    }, 30000);
  }

  // Get current status
  getStatus(): {
    isActive: boolean;
    pingInterval: number;
    retryCount: number;
    maxRetries: number;
  } {
    return {
      isActive: this.isActive,
      pingInterval: this.pingInterval,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries
    };
  }
}

// External keep-alive service (using external monitoring)
export class ExternalKeepAlive {
  private static readonly EXTERNAL_SERVICES = [
    'https://uptimerobot.com', // Free tier allows 50 monitors
    'https://freshping.io',    // Free tier allows 50 checks
    'https://statuscake.com'   // Free tier allows 10 tests
  ];

  // Generate keep-alive configuration for external services
  static generateConfig(): {
    url: string;
    interval: number;
    timeout: number;
    expectedStatus: number;
    userAgent: string;
  } {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                   process.env.VERCEL_URL || 
                   'https://your-app.onrender.com';

    return {
      url: `${baseUrl}/api/health/ping`,
      interval: 10, // 10 minutes
      timeout: 30,  // 30 seconds
      expectedStatus: 200,
      userAgent: 'External-KeepAlive-Monitor'
    };
  }

  // Instructions for setting up external monitoring
  static getSetupInstructions(): string {
    const config = this.generateConfig();
    
    return `
设置外部监控服务来保持服务器活跃:

1. UptimeRobot (推荐):
   - 注册免费账户: https://uptimerobot.com
   - 创建新监控: HTTP(s)
   - URL: ${config.url}
   - 监控间隔: ${config.interval} 分钟
   - 超时: ${config.timeout} 秒

2. Freshping:
   - 注册免费账户: https://freshping.io
   - 添加新检查点
   - URL: ${config.url}
   - 检查间隔: ${config.interval} 分钟

3. StatusCake:
   - 注册免费账户: https://statuscake.com
   - 创建新测试
   - URL: ${config.url}
   - 测试间隔: ${config.interval} 分钟

配置完成后，这些服务会定期访问你的应用，防止 Render 服务器休眠。
    `;
  }
}

// Utility functions
export function startKeepAlive(): void {
  const keepAlive = ServerKeepAlive.getInstance();
  keepAlive.start();
}

export function stopKeepAlive(): void {
  const keepAlive = ServerKeepAlive.getInstance();
  keepAlive.stop();
}

export function getKeepAliveStatus() {
  const keepAlive = ServerKeepAlive.getInstance();
  return keepAlive.getStatus();
}
