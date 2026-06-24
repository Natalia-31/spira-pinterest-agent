import { appendFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const LOG_FILE = 'logs/agent.log';

export class Logger {
  private logFile: string;

  constructor(logFile: string = LOG_FILE) {
    this.logFile = logFile;
  }

  async initialize(): Promise<void> {
    const dir = join(process.cwd(), 'logs');
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }

  private async write(level: string, message: string): Promise<void> {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [${level}] ${message}\n`;
    
    try {
      await appendFile(this.logFile, line);
    } catch (error) {
      console.error('Failed to write log:', error);
    }
    
    console.log(line.trim());
  }

  async info(message: string): Promise<void> {
    await this.write('INFO', message);
  }

  async warn(message: string): Promise<void> {
    await this.write('WARN', message);
  }

  async error(message: string): Promise<void> {
    await this.write('ERROR', message);
  }

  async debug(message: string): Promise<void> {
    await this.write('DEBUG', message);
  }
}

export const logger = new Logger();