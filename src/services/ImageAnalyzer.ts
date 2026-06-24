import sharp from 'sharp';
import { join, basename } from 'path';
import { writeFile, mkdir, rename } from 'fs/promises';
import { existsSync } from 'fs';
import { ImageAnalysisResult } from '../types/ImageTask.js';
import { logger } from '../utils/logger.js';
import { AiImageAnalyzer } from './AiImageAnalyzer.js';
import { PinContentGenerator } from '../generators/PinContentGenerator.js';
import { PinImageGenerator } from '../generators/PinImageGenerator.js';

export class ImageAnalyzer {
  private processedDir: string;
  private tasksDir: string;
  private aiAnalyzer: AiImageAnalyzer;
  private pinContentGenerator: PinContentGenerator;
  private pinImageGenerator: PinImageGenerator;

  constructor(processedDir: string = 'content/processed', tasksDir: string = 'content/processed/tasks') {
    this.processedDir = processedDir;
    this.tasksDir = tasksDir;
    this.aiAnalyzer = new AiImageAnalyzer();
    this.pinContentGenerator = new PinContentGenerator();
    this.pinImageGenerator = new PinImageGenerator();
  }

  async initialize(): Promise<void> {
    for (const dir of [this.processedDir, join(this.processedDir, 'images'), this.tasksDir]) {
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }
    }
    await this.aiAnalyzer.initialize();
    await this.pinContentGenerator.initialize();
    await this.pinImageGenerator.initialize();
  }

  async analyze(imagePath: string, taskId: string): Promise<ImageAnalysisResult> {
    const fileName = basename(imagePath);
    
    try {
      logger.info(`Analyzing image: ${fileName}`);

      const metadata = await sharp(imagePath).metadata();
      
      const width = metadata.width || 0;
      const height = metadata.height || 0;
      const format = metadata.format || 'unknown';
      
      let orientation: 'horizontal' | 'vertical' | 'square';
      if (width > height) {
        orientation = 'horizontal';
      } else if (height > width) {
        orientation = 'vertical';
      } else {
        orientation = 'square';
      }

      const result: ImageAnalysisResult = {
        id: taskId,
        image: imagePath,
        fileName,
        width,
        height,
        orientation,
        format,
        status: 'analyzed',
        createdAt: new Date().toISOString(),
        analyzedAt: new Date().toISOString(),
      };

      // Save analysis JSON
      await this.saveTask(result);
      
      // Move image to processed/images
      await this.moveImage(imagePath, fileName);
      
      // Run AI analysis
      const destPath = join(this.processedDir, 'images', fileName);
      const aiResult = await this.aiAnalyzer.analyze(destPath, taskId);
      
      // Generate pin content if AI analysis succeeded
      if (aiResult) {
        const pinContentResult = await this.pinContentGenerator.generate(
          aiResult.analysis,
          destPath,
          taskId
        );

        await this.pinImageGenerator.generate(
          destPath,
          pinContentResult.content,
          aiResult.analysis,
          taskId
        );
        
        // Update task status
        result.status = 'content_generated';
        await this.saveTask(result);
      }
      
      logger.info(`Image analyzed: ${fileName} (${width}x${height}, ${orientation})`);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error(`Failed to analyze image ${fileName}: ${errorMessage}`);

      const result: ImageAnalysisResult = {
        id: taskId,
        image: imagePath,
        fileName,
        width: 0,
        height: 0,
        orientation: 'square',
        format: 'unknown',
        status: 'error',
        createdAt: new Date().toISOString(),
        error: errorMessage,
      };

      await this.saveTask(result);
      return result;
    }
  }

  private async saveTask(result: ImageAnalysisResult): Promise<void> {
    const taskPath = join(this.tasksDir, `${result.id}.json`);
    await writeFile(taskPath, JSON.stringify(result, null, 2), 'utf-8');
  }

  private async moveImage(imagePath: string, fileName: string): Promise<void> {
    const destPath = join(this.processedDir, 'images', fileName);
    await rename(imagePath, destPath);
  }
}