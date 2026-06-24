import { createCanvas, loadImage } from '@napi-rs/canvas';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, basename } from 'path';
import sharp from 'sharp';
import { PinContent } from '../types/PinContent.js';
import { AiImageAnalysis } from '../types/AiAnalysis.js';
import { PinVisualResult, GeneratedPin } from '../types/PinVisual.js';
import { logger } from '../utils/logger.js';

type PinVisualType = 'photo' | 'photo_text' | 'collage' | 'collage_text' | 'experimental';

interface VisualVariant {
  fileName: string;
  type: PinVisualType;
  headline: string;
  subheadline: string;
  cta: string;
  renderer: (baseImageBuffer: Buffer, content: PinContent, analysis: AiImageAnalysis) => Promise<Buffer>;
}

export class PinImageGenerator {
  private outputDir: string;
  private readonly PIN_WIDTH = 1000;
  private readonly PIN_HEIGHT = 1500;

  constructor(outputDir: string = 'content/processed/generated-pins') {
    this.outputDir = outputDir;
  }

  async initialize(): Promise<void> {
    if (!existsSync(this.outputDir)) {
      await mkdir(this.outputDir, { recursive: true });
    }
  }

  async generate(
    imagePath: string,
    pinContent: PinContent,
    analysis: AiImageAnalysis,
    taskId: string
  ): Promise<PinVisualResult> {
    const fileName = basename(imagePath);
    logger.info(`Generating Pinterest visuals for: ${fileName}`);

    const taskDir = join(this.outputDir, taskId);
    if (!existsSync(taskDir)) {
      await mkdir(taskDir, { recursive: true });
    }

    const baseImageBuffer = await this.prepareBaseImage(imagePath);
    const variants = this.createVariants(pinContent, analysis);
    const generatedPins: GeneratedPin[] = [];

    for (const variant of variants) {
      const imageBuffer = await variant.renderer(baseImageBuffer, pinContent, analysis);
      const filePath = join(taskDir, variant.fileName);
      await writeFile(filePath, imageBuffer);

      generatedPins.push({
        file: filePath.replace(/\\/g, '/'),
        type: variant.type,
        headline: variant.headline,
        cta: variant.cta,
      });
    }

    const result: PinVisualResult = {
      taskId,
      imagePath,
      generatedPins,
      createdAt: new Date().toISOString(),
    };

    await writeFile(
      join(taskDir, `${taskId}.visuals.json`),
      JSON.stringify(result, null, 2),
      'utf-8'
    );

    logger.info(`Pinterest visuals generated for: ${fileName}`);
    return result;
  }

  private async prepareBaseImage(imagePath: string): Promise<Buffer> {
    return sharp(imagePath)
      .resize(this.PIN_WIDTH, this.PIN_HEIGHT, { fit: 'cover', position: 'attention' })
      .jpeg({ quality: 92, mozjpeg: true })
      .toBuffer();
  }

  private createVariants(content: PinContent, analysis: AiImageAnalysis): VisualVariant[] {
    const headline = this.toTitleCase(content.imageText || content.title || analysis.mainKeyword);
    const shortHeadline = this.toTitleCase(content.title || analysis.mainKeyword);
    const subheadline = this.toTitleCase(`${analysis.style} ${analysis.productType}`.trim());
    const cta = this.getCta(content.pinGoal);

    return [
      {
        fileName: 'pin_01_photo.jpg',
        type: 'photo',
        headline: shortHeadline,
        subheadline,
        cta: '',
        renderer: (base) => this.renderPhoto(base, shortHeadline),
      },
      {
        fileName: 'pin_02_photo_text.jpg',
        type: 'photo_text',
        headline,
        subheadline,
        cta,
        renderer: (base) => this.renderPhotoText(base, headline, subheadline, cta),
      },
      {
        fileName: 'pin_03_collage.jpg',
        type: 'collage',
        headline: shortHeadline,
        subheadline,
        cta: 'Save Idea',
        renderer: (base) => this.renderCollage(base, shortHeadline, false),
      },
      {
        fileName: 'pin_04_flatlay.jpg',
        type: 'collage_text',
        headline,
        subheadline,
        cta,
        renderer: (base) => this.renderCollage(base, headline, true, cta),
      },
      {
        fileName: 'pin_05_experimental.jpg',
        type: 'experimental',
        headline,
        subheadline,
        cta,
        renderer: (base, pinContent, aiAnalysis) => this.renderExperimental(base, pinContent, aiAnalysis, headline, cta),
      },
    ];
  }

  private async renderPhoto(baseImageBuffer: Buffer, headline: string): Promise<Buffer> {
    const canvas = createCanvas(this.PIN_WIDTH, this.PIN_HEIGHT);
    const ctx = canvas.getContext('2d') as any;
    const image = await loadImage(baseImageBuffer as any);

    ctx.drawImage(image, 0, 0, this.PIN_WIDTH, this.PIN_HEIGHT);
    this.drawSoftVignette(ctx);
    this.drawBadge(ctx, 'SPIRA PIN', 52, 54, '#ffffff', '#111111');
    this.drawTinyCaption(ctx, headline, 52, this.PIN_HEIGHT - 70);

    return this.canvasToJpeg(canvas);
  }

  private async renderPhotoText(
    baseImageBuffer: Buffer,
    headline: string,
    subheadline: string,
    cta: string
  ): Promise<Buffer> {
    const canvas = createCanvas(this.PIN_WIDTH, this.PIN_HEIGHT);
    const ctx = canvas.getContext('2d') as any;
    const image = await loadImage(baseImageBuffer as any);

    ctx.drawImage(image, 0, 0, this.PIN_WIDTH, this.PIN_HEIGHT);
    this.drawGradientPanel(ctx, 0, 860, this.PIN_WIDTH, 640, 'rgba(12, 12, 12, 0)', 'rgba(12, 12, 12, 0.86)');
    this.drawHeadlineWithDigitHighlight(ctx, headline, 70, 990, 92, '#ffffff', '#ffcf33');
    this.drawWrappedText(ctx, subheadline, 74, 1195, 820, 42, '#f5f0e8', '600 42px Arial', 52);
    this.drawButton(ctx, cta, 70, 1300, 330, 86, '#ff3d7f', '#ffffff');
    this.drawArrow(ctx, 445, 1343, 640, 1260, '#ffcf33');

    return this.canvasToJpeg(canvas);
  }

  private async renderCollage(
    baseImageBuffer: Buffer,
    headline: string,
    withText: boolean,
    cta: string = 'Save This'
  ): Promise<Buffer> {
    const canvas = createCanvas(this.PIN_WIDTH, this.PIN_HEIGHT);
    const ctx = canvas.getContext('2d') as any;
    const image = await loadImage(baseImageBuffer as any);

    ctx.fillStyle = '#f7efe6';
    ctx.fillRect(0, 0, this.PIN_WIDTH, this.PIN_HEIGHT);

    this.drawPolaroidCrop(ctx, image, 70, 78, 620, 700, 0, 0, 1000, 900, -4);
    this.drawPolaroidCrop(ctx, image, 390, 470, 540, 610, 180, 340, 760, 880, 5);
    this.drawPolaroidCrop(ctx, image, 88, 930, 480, 430, 0, 760, 840, 620, 3);
    this.drawCircleAccent(ctx, 792, 160, 118, '#ffcf33', '3');
    this.drawBadge(ctx, 'COLLAGE IDEA', 650, 1135, '#111111', '#ffffff');

    if (withText) {
      ctx.fillStyle = 'rgba(255, 61, 127, 0.94)';
      this.roundRect(ctx, 74, 1080, 852, 310, 38, true, false);
      this.drawHeadlineWithDigitHighlight(ctx, headline, 112, 1168, 66, '#ffffff', '#111111');
      this.drawButton(ctx, cta, 112, 1288, 300, 74, '#111111', '#ffffff');
    } else {
      this.drawWrappedText(ctx, headline, 645, 1240, 280, 44, '#111111', '800 44px Arial', 52);
    }

    return this.canvasToJpeg(canvas);
  }

  private async renderExperimental(
    baseImageBuffer: Buffer,
    content: PinContent,
    analysis: AiImageAnalysis,
    headline: string,
    cta: string
  ): Promise<Buffer> {
    const canvas = createCanvas(this.PIN_WIDTH, this.PIN_HEIGHT);
    const ctx = canvas.getContext('2d') as any;
    const image = await loadImage(baseImageBuffer as any);
    const accent = this.pickAccentColor(analysis.colors);

    ctx.fillStyle = '#141414';
    ctx.fillRect(0, 0, this.PIN_WIDTH, this.PIN_HEIGHT);

    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(880, 120, 250, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(500, 600);
    ctx.rotate(-0.1);
    this.drawRoundedImage(ctx, image, -365, -460, 730, 920, 54);
    ctx.restore();

    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    this.roundRect(ctx, 60, 910, 880, 430, 44, true, false);
    this.drawBadge(ctx, 'PINTEREST STYLE', 96, 954, '#111111', '#ffcf33');
    this.drawHeadlineWithDigitHighlight(ctx, headline, 96, 1082, 78, '#111111', accent);
    this.drawWrappedText(ctx, content.description.split('.').slice(0, 1).join('.'), 100, 1242, 670, 32, '#333333', '600 32px Arial', 40);
    this.drawButton(ctx, cta, 96, 1366, 330, 78, '#111111', '#ffffff');
    this.drawArrow(ctx, 560, 1400, 790, 1310, accent);
    this.drawCircleAccent(ctx, 792, 1264, 96, accent, this.extractLeadingNumber(headline) ?? '!');

    return this.canvasToJpeg(canvas);
  }

  private drawRoundedImage(ctx: any, image: any, x: number, y: number, width: number, height: number, radius: number): void {
    ctx.save();
    this.roundRect(ctx, x, y, width, height, radius, false, false);
    ctx.clip();
    ctx.drawImage(image, x, y, width, height);
    ctx.restore();
  }

  private drawPolaroidCrop(
    ctx: any,
    image: any,
    x: number,
    y: number,
    width: number,
    height: number,
    sourceX: number,
    sourceY: number,
    sourceWidth: number,
    sourceHeight: number,
    rotationDeg: number
  ): void {
    ctx.save();
    ctx.translate(x + width / 2, y + height / 2);
    ctx.rotate((rotationDeg * Math.PI) / 180);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.22)';
    ctx.shadowBlur = 26;
    ctx.shadowOffsetY = 14;
    this.roundRect(ctx, -width / 2, -height / 2, width, height, 26, true, false);
    ctx.shadowColor = 'transparent';
    this.roundRect(ctx, -width / 2 + 24, -height / 2 + 24, width - 48, height - 88, 20, false, false);
    ctx.clip();
    ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, -width / 2 + 24, -height / 2 + 24, width - 48, height - 88);
    ctx.restore();
  }

  private drawHeadlineWithDigitHighlight(
    ctx: any,
    text: string,
    x: number,
    y: number,
    fontSize: number,
    color: string,
    highlightColor: string
  ): void {
    const leadingNumber = this.extractLeadingNumber(text);
    const lineHeight = Math.round(fontSize * 1.04);

    if (!leadingNumber) {
      this.drawWrappedText(ctx, text, x, y, 830, fontSize, color, `900 ${fontSize}px Arial`, lineHeight);
      return;
    }

    ctx.save();
    ctx.fillStyle = highlightColor;
    ctx.beginPath();
    ctx.arc(x + 72, y - 42, 78, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color === '#111111' ? '#ffffff' : '#111111';
    ctx.font = `900 ${fontSize + 18}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(leadingNumber, x + 72, y - 8);
    ctx.restore();

    const withoutNumber = text.replace(/^\s*\d+\s*/u, '').trim();
    this.drawWrappedText(ctx, withoutNumber, x + 172, y - 72, 650, fontSize, color, `900 ${fontSize}px Arial`, lineHeight);
  }

  private drawWrappedText(
    ctx: any,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    fontSize: number,
    color: string,
    font: string,
    lineHeight: number
  ): void {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current = '';

    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textBaseline = 'alphabetic';

    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }

    if (current) {
      lines.push(current);
    }

    lines.slice(0, 4).forEach((line, index) => {
      ctx.fillText(line, x, y + index * lineHeight);
    });
  }

  private drawGradientPanel(ctx: any, x: number, y: number, width: number, height: number, from: string, to: string): void {
    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, from);
    gradient.addColorStop(1, to);
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);
  }

  private drawSoftVignette(ctx: any): void {
    this.drawGradientPanel(ctx, 0, 0, this.PIN_WIDTH, 290, 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0)');
    this.drawGradientPanel(ctx, 0, 1180, this.PIN_WIDTH, 320, 'rgba(0,0,0,0)', 'rgba(0,0,0,0.42)');
  }

  private drawBadge(ctx: any, text: string, x: number, y: number, bg: string, color: string): void {
    ctx.font = '800 24px Arial';
    const width = Math.ceil(ctx.measureText(text).width) + 44;
    ctx.fillStyle = bg;
    this.roundRect(ctx, x, y, width, 52, 26, true, false);
    ctx.fillStyle = color;
    ctx.fillText(text, x + 22, y + 35);
  }

  private drawTinyCaption(ctx: any, text: string, x: number, y: number): void {
    ctx.font = '700 28px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text.substring(0, 52), x, y);
  }

  private drawButton(ctx: any, text: string, x: number, y: number, width: number, height: number, bg: string, color: string): void {
    ctx.fillStyle = bg;
    this.roundRect(ctx, x, y, width, height, height / 2, true, false);
    ctx.fillStyle = color;
    ctx.font = '900 30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(text.toUpperCase(), x + width / 2, y + height / 2 + 11);
    ctx.textAlign = 'start';
  }

  private drawArrow(ctx: any, fromX: number, fromY: number, toX: number, toY: number, color: string): void {
    const angle = Math.atan2(toY - fromY, toX - fromX);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.quadraticCurveTo((fromX + toX) / 2, fromY - 130, toX, toY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - 38 * Math.cos(angle - Math.PI / 6), toY - 38 * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - 38 * Math.cos(angle + Math.PI / 6), toY - 38 * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawCircleAccent(ctx: any, x: number, y: number, radius: number, color: string, label: string): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111111';
    ctx.font = `900 ${Math.round(radius * 0.9)}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y + radius * 0.32);
    ctx.textAlign = 'start';
  }

  private roundRect(ctx: any, x: number, y: number, width: number, height: number, radius: number, fill: boolean, stroke: boolean): void {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  private canvasToJpeg(canvas: any): Buffer {
    return canvas.toBuffer('image/jpeg', 0.92) as Buffer;
  }

  private extractLeadingNumber(text: string): string | null {
    return text.match(/^\s*(\d+)/u)?.[1] ?? null;
  }

  private getCta(goal: PinContent['pinGoal']): string {
    switch (goal) {
      case 'sales':
        return 'Shop Look';
      case 'clicks':
        return 'Read More';
      case 'saves':
        return 'Save This';
      case 'impressions':
      default:
        return 'Get Ideas';
    }
  }

  private toTitleCase(value: string): string {
    return value
      .replace(/[_-]+/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
      .join(' ');
  }

  private pickAccentColor(colors: string[]): string {
    const firstUsefulColor = colors.find((color) => /^#?[0-9a-f]{6}$/i.test(color));
    if (!firstUsefulColor) return '#ffcf33';
    return firstUsefulColor.startsWith('#') ? firstUsefulColor : `#${firstUsefulColor}`;
  }
}