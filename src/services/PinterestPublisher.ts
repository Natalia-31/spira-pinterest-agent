import axios, { AxiosError, AxiosInstance } from 'axios';
import { readFile } from 'fs/promises';
import { extname } from 'path';
import { env } from '../config/env.js';
import {
  PinterestCreatePinRequest,
  PinterestImageContentType,
  PinterestPinResponse,
  PinterestPublisherConfig,
  PublishPinInput,
} from '../types/PinterestPublisher.js';
import { logger } from '../utils/logger.js';

const DEFAULT_API_BASE_URL = 'https://api.pinterest.com/v5';

export class PinterestPublisher {
  private accessToken?: string;
  private client: AxiosInstance;

  constructor(config: PinterestPublisherConfig = {}) {
    this.accessToken = config.accessToken ?? env.PINTEREST_ACCESS_TOKEN;
    this.client = axios.create({
      baseURL: config.apiBaseUrl ?? DEFAULT_API_BASE_URL,
      timeout: 30000,
    });
  }

  async buildCreatePinRequest(input: PublishPinInput): Promise<PinterestCreatePinRequest> {
    this.validateInput(input);

    const request: PinterestCreatePinRequest = {
      board_id: input.boardId,
      title: input.title,
      description: input.description,
      alt_text: input.altText,
      media_source: input.imageUrl
        ? {
            source_type: 'image_url',
            url: input.imageUrl,
          }
        : {
            source_type: 'image_base64',
            content_type: this.getContentType(input.imagePath as string),
            data: await this.imageToBase64(input.imagePath as string),
          },
    };

    if (input.link) request.link = input.link;
    if (input.boardSectionId) request.board_section_id = input.boardSectionId;
    if (input.dominantColor) request.dominant_color = input.dominantColor;

    return request;
  }

  async publishPin(input: PublishPinInput): Promise<PinterestPinResponse> {
    if (!this.accessToken) {
      throw new Error('PINTEREST_ACCESS_TOKEN is required to publish a pin');
    }

    const request = await this.buildCreatePinRequest(input);

    try {
      await logger.info(`Publishing pin to Pinterest board ${input.boardId}: ${input.title}`);

      const response = await this.client.post<PinterestPinResponse>('/pins', request, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      await logger.info(`Pinterest pin published: ${response.data.id}`);
      return response.data;
    } catch (error) {
      const message = this.toErrorMessage(error);
      await logger.error(`Pinterest publish failed: ${message}`);
      throw new Error(`Pinterest publish failed: ${message}`);
    }
  }

  private validateInput(input: PublishPinInput): void {
    const missingFields = [
      ['boardId', input.boardId],
      ['title', input.title],
      ['description', input.description],
      ['altText', input.altText],
    ].filter(([, value]) => !value);

    if (missingFields.length > 0) {
      throw new Error(`Missing required publish fields: ${missingFields.map(([field]) => field).join(', ')}`);
    }

    if (!input.imagePath && !input.imageUrl) {
      throw new Error('Either imagePath or imageUrl is required to publish a pin');
    }

    if (input.imagePath && input.imageUrl) {
      throw new Error('Use either imagePath or imageUrl, not both');
    }
  }

  private async imageToBase64(imagePath: string): Promise<string> {
    const image = await readFile(imagePath);
    return image.toString('base64');
  }

  private getContentType(imagePath: string): PinterestImageContentType {
    const extension = extname(imagePath).toLowerCase();
    if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
    if (extension === '.png') return 'image/png';
    if (extension === '.webp') return 'image/webp';
    throw new Error(`Unsupported Pinterest image format: ${extension || 'unknown'}`);
  }

  private toErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      return this.formatAxiosError(error);
    }

    return error instanceof Error ? error.message : 'Unknown error';
  }

  private formatAxiosError(error: AxiosError): string {
    const status = error.response?.status;
    const data = error.response?.data;
    const details = typeof data === 'string' ? data : JSON.stringify(data);
    return [status ? `HTTP ${status}` : undefined, error.message, details].filter(Boolean).join(' — ');
  }
}

export { DEFAULT_API_BASE_URL as DEFAULT_PINTEREST_API_BASE_URL };
