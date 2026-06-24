import OpenAI from 'openai';
import { readFile } from 'fs/promises';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, basename } from 'path';
import { AiImageAnalysis, AiAnalysisResult } from '../types/AiAnalysis.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export class AiImageAnalyzer {
  private client: OpenAI;
  private analysisDir: string;
  private errorsDir: string;

  constructor() {
    this.client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
    this.analysisDir = 'content/processed/analysis';
    this.errorsDir = 'content/errors';
  }

  async initialize(): Promise<void> {
    for (const dir of [this.analysisDir, this.errorsDir]) {
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }
    }
  }

  async analyze(imagePath: string, taskId: string): Promise<AiAnalysisResult | null> {
    const fileName = basename(imagePath);

    try {
      logger.info(`Starting AI analysis for: ${fileName}`);

      const base64Image = await this.imageToBase64(imagePath);
      const analysis = await this.callOpenAI(base64Image, fileName);

      const result: AiAnalysisResult = {
        taskId,
        imagePath,
        analysis,
        createdAt: new Date().toISOString(),
      };

      await this.saveAnalysis(result, taskId);
      logger.info(`AI analysis completed for: ${fileName}`);

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`AI analysis failed for ${fileName}: ${message}`);
      await this.saveError(taskId, fileName, imagePath, message);
      return null;
    }
  }

  private async callOpenAI(base64Image: string, fileName: string): Promise<AiImageAnalysis> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a Pinterest SEO expert analyzing images for the SPIRA brand — a conscious fashion brand for women.

Analyze the image and return ONLY a JSON object with this exact structure:
{
  "productType": "specific clothing item or product type, or empty if not clear",
  "visualDescription": "detailed description of what is visible in the image",
  "style": "fashion style: minimalist, business casual, elegant, bohemian, streetwear, etc.",
  "colors": ["dominant color 1", "dominant color 2"],
  "audience": "target audience description",
  "possibleBoards": ["board type 1", "board type 2", "board type 3"],
  "mainKeyword": "main Pinterest search keyword",
  "relatedKeywords": ["keyword 1", "keyword 2", "keyword 3", "keyword 4", "keyword 5"],
  "pinGoal": "traffic | saves | clicks | sales",
  "recommendedPinTypes": ["product-photo", "product-text", "collage", "flat-lay", "video", "text-only", "pinterest-style"]
}

Rules:
- Describe ONLY what is visible. Do not invent products.
- If clothing: specify exact type (blazer, trousers, dress, suit, etc.)
- Style must be specific and accurate.
- Colors: list 2-4 dominant colors.
- Audience: describe the woman who would wear this.
- Possible boards: promoting, engaging, selling, brand.
- Main keyword: the primary Pinterest search term.
- Related keywords: 3-5 semantic variations.
- Pin goal: choose based on content type.
- Recommended pin types: suggest 3-5 types from the list.

Return ONLY valid JSON. No markdown, no explanations.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this image for Pinterest: ${fileName}`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content || '';

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in OpenAI response');
    }

    const parsed = JSON.parse(jsonMatch[0]) as AiImageAnalysis;

    // Validate required fields
    if (!parsed.productType || !parsed.visualDescription || !parsed.style) {
      throw new Error('Incomplete analysis from OpenAI');
    }

    return parsed;
  }

  private async imageToBase64(imagePath: string): Promise<string> {
    const buffer = await readFile(imagePath);
    return buffer.toString('base64');
  }

  private async saveAnalysis(result: AiAnalysisResult, taskId: string): Promise<void> {
    const filePath = join(this.analysisDir, `${taskId}.analysis.json`);
    await writeFile(filePath, JSON.stringify(result, null, 2), 'utf-8');
  }

  private async saveError(
    taskId: string,
    fileName: string,
    imagePath: string,
    error: string
  ): Promise<void> {
    const errorData = {
      taskId,
      fileName,
      imagePath,
      error,
      createdAt: new Date().toISOString(),
    };

    const filePath = join(this.errorsDir, `${taskId}.error.json`);
    await writeFile(filePath, JSON.stringify(errorData, null, 2), 'utf-8');
  }
}