import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, basename } from 'path';
import { AiImageAnalysis } from '../types/AiAnalysis.js';
import { PinContent, PinContentResult } from '../types/PinContent.js';
import { logger } from '../utils/logger.js';

export class PinContentGenerator {
  private outputDir: string;

  constructor(outputDir: string = 'content/processed/pin-content') {
    this.outputDir = outputDir;
  }

  async initialize(): Promise<void> {
    if (!existsSync(this.outputDir)) {
      await mkdir(this.outputDir, { recursive: true });
    }
  }

  async generate(
    analysis: AiImageAnalysis,
    imagePath: string,
    taskId: string,
    productUrl?: string,
    boardName?: string
  ): Promise<PinContentResult> {
    const fileName = basename(imagePath);

    logger.info(`Generating pin content for: ${fileName}`);

    const content = this.buildContent(analysis, imagePath, productUrl, boardName);

    const result: PinContentResult = {
      taskId,
      imagePath,
      content,
      createdAt: new Date().toISOString(),
    };

    await this.saveContent(result, taskId);
    logger.info(`Pin content generated for: ${fileName}`);

    return result;
  }

  private buildContent(
    analysis: AiImageAnalysis,
    imagePath: string,
    productUrl?: string,
    boardName?: string
  ): PinContent {
    const keyword = analysis.mainKeyword;
    const related = analysis.relatedKeywords;
    const product = analysis.productType;
    const style = analysis.style;
    const audience = analysis.audience;

    // Title: SEO + click, max 100 chars
    const title = this.generateTitle(keyword, product, style);

    // ImageText: large text overlay, curiosity/CTA
    const imageText = this.generateImageText(keyword, product, style);

    // Description: 2-4 sentences, keyword first, CTA
    const description = this.generateDescription(keyword, product, style, audience, productUrl);

    // AltText: natural description
    const altText = this.generateAltText(analysis.visualDescription, keyword);

    // Hashtags: 3-5 max
    const hashtags = this.generateHashtags(keyword, related);

    // SEO file name: kebab-case
    const seoFileName = this.generateSeoFileName(keyword, product);

    // Board type from possibleBoards
    const boardType = this.determineBoardType(analysis.possibleBoards, boardName);

    // Pin type from recommendations
    const pinType = this.determinePinType(analysis.recommendedPinTypes);

    // Pin goal
    const pinGoal = this.determinePinGoal(analysis.pinGoal);

    return {
      title,
      imageText,
      description,
      altText,
      hashtags,
      seoFileName,
      boardType,
      pinType,
      pinGoal,
    };
  }

  private generateTitle(keyword: string, product: string, style: string): string {
    const templates = [
      `${keyword} — ${style} style`,
      `${product} for ${style} look`,
      `${keyword} ideas`,
      `${style} ${product}`,
      `${keyword} inspiration`,
    ];

    let title = templates[0];
    if (title.length > 100) {
      title = title.substring(0, 97) + '...';
    }
    return title;
  }

  private generateImageText(keyword: string, product: string, style: string): string {
    const templates = [
      `5 ways to style ${product}`,
      `${style} essentials`,
      `How to wear ${product}`,
      `${keyword} guide`,
      `Must-have ${product}`,
      `Style tip: ${product}`,
    ];

    return templates[Math.floor(Math.random() * templates.length)];
  }

  private generateDescription(
    keyword: string,
    product: string,
    style: string,
    audience: string,
    productUrl?: string
  ): string {
    const sentences = [
      `Discover ${keyword} in ${style} style — perfect for ${audience}.`,
      `This ${product} combines comfort and elegance for everyday wear.`,
      `Save this pin for your next outfit inspiration.`,
    ];

    if (productUrl) {
      sentences.push(`Click to shop the look: ${productUrl}`);
    } else {
      sentences.push(`Tap to explore more ${style} ideas.`);
    }

    return sentences.join(' ');
  }

  private generateAltText(visualDescription: string, keyword: string): string {
    return `${visualDescription}. ${keyword} style inspiration.`;
  }

  private generateHashtags(keyword: string, related: string[]): string[] {
    const tags = [keyword.replace(/\s+/g, '')];
    const additional = related.slice(0, 4).map((k) => k.replace(/\s+/g, ''));
    return [...tags, ...additional].slice(0, 5);
  }

  private generateSeoFileName(keyword: string, product: string): string {
    const base = `${keyword}-${product}`.toLowerCase();
    return base
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 60);
  }

  private determineBoardType(
    possibleBoards: string[],
    boardName?: string
  ): 'promotional' | 'engagement' | 'sales' | 'brand' {
    if (boardName) {
      const lower = boardName.toLowerCase();
      if (lower.includes('sell')) return 'sales';
      if (lower.includes('brand')) return 'brand';
      if (lower.includes('engage')) return 'engagement';
    }

    const boards = possibleBoards.map((b) => b.toLowerCase());
    if (boards.some((b) => b.includes('sell'))) return 'sales';
    if (boards.some((b) => b.includes('brand'))) return 'brand';
    if (boards.some((b) => b.includes('engage'))) return 'engagement';
    return 'promotional';
  }

  private determinePinType(recommended: string[]): PinContent['pinType'] {
    const types: PinContent['pinType'][] = [
      'photo',
      'photo_text',
      'collage',
      'flat_lay',
      'video',
      'text_only',
      'experimental',
    ];

    for (const rec of recommended) {
      const lower = rec.toLowerCase();
      if (lower.includes('photo') && lower.includes('text')) return 'photo_text';
      if (lower.includes('photo')) return 'photo';
      if (lower.includes('collage')) return 'collage';
      if (lower.includes('flat')) return 'flat_lay';
      if (lower.includes('video')) return 'video';
      if (lower.includes('text')) return 'text_only';
    }

    return 'photo';
  }

  private determinePinGoal(goal: string): PinContent['pinGoal'] {
    const lower = goal.toLowerCase();
    if (lower.includes('sale')) return 'sales';
    if (lower.includes('click')) return 'clicks';
    if (lower.includes('save')) return 'saves';
    return 'impressions';
  }

  private async saveContent(result: PinContentResult, taskId: string): Promise<void> {
    const filePath = join(this.outputDir, `${taskId}.pin-content.json`);
    await writeFile(filePath, JSON.stringify(result, null, 2), 'utf-8');
  }
}