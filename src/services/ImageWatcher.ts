import { watch } from 'chokidar';
import { extname, basename } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ImageTask } from '../types/ImageTask.js';
import { ImageAnalyzer } from './ImageAnalyzer.js';
import { logger } from '../utils/logger.js';

export class ImageWatcher {
  private watcher: ReturnType<typeof watch> | null = null;
  private queue: ImageTask[] = [];
  private isProcessing: boolean = false;
  private analyzer: ImageAnalyzer;
  private newDir: string;

  constructor(newDir: string = 'content/new') {
    this.newDir = newDir;
    this.analyzer = new ImageAnalyzer();
  }

  async initialize(): Promise<void> {
    await this.analyzer.initialize();
    await logger.initialize();
    
    logger.info('ImageWatcher initialized');
  }

  start(): void {
    logger.info(`Watching folder: ${this.newDir}`);

    this.watcher = watch(this.newDir, {
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100,
      },
    });

    this.watcher.on('add', (filePath: string) => {
      const ext = extname(filePath).toLowerCase();
      const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

      if (!validExtensions.includes(ext)) {
        logger.warn(`Ignoring unsupported file: ${basename(filePath)}`);
        return;
      }

      const task: ImageTask = {
        id: uuidv4(),
        imagePath: filePath,
        fileName: basename(filePath),
        createdAt: new Date().toISOString(),
      };

      logger.info(`New image detected: ${task.fileName}`);
      this.queue.push(task);
      this.processQueue();
    });

    this.watcher.on('error', (error: Error) => {
      logger.error(`Watcher error: ${error.message}`);
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (!task) continue;

      try {
        logger.info(`Processing task ${task.id}: ${task.fileName}`);
        await this.analyzer.analyze(task.imagePath, task.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Failed to process task ${task.id}: ${message}`);
      }
    }

    this.isProcessing = false;
    logger.info('Queue processed');
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      logger.info('ImageWatcher stopped');
    }
  }

  getQueueLength(): number {
    return this.queue.length;
  }
}