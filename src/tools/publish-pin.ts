import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { env } from '../config/env.js';
import { PinterestPublisher } from '../services/PinterestPublisher.js';
import { PublishPinInput } from '../types/PinterestPublisher.js';
import { logger } from '../utils/logger.js';

interface CliOptions {
  imagePath?: string;
  imageUrl?: string;
  boardId?: string;
  title?: string;
  description?: string;
  altText?: string;
  link?: string;
  boardSectionId?: string;
  dominantColor?: string;
  confirmPublish: boolean;
  outputFile: string;
}

async function main(): Promise<void> {
  await logger.initialize();

  const options = parseArgs(process.argv.slice(2));
  const input = toPublishPinInput(options);
  const publisher = new PinterestPublisher();
  const request = await publisher.buildCreatePinRequest(input);

  if (!options.confirmPublish) {
    await saveJson(options.outputFile, {
      mode: 'dry-run',
      message: 'Pin was not published. Add --confirm-publish to send it to Pinterest.',
      request: redactBase64(request),
      createdAt: new Date().toISOString(),
    });

    await logger.info(`Pinterest publish dry-run saved: ${options.outputFile}`);
    return;
  }

  const response = await publisher.publishPin(input);
  await saveJson(options.outputFile, {
    mode: 'published',
    request: redactBase64(request),
    response,
    createdAt: new Date().toISOString(),
  });

  await logger.info(`Pinterest publish result saved: ${options.outputFile}`);
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    confirmPublish: false,
    outputFile: 'content/published/latest-publish-result.json',
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    if (arg === '--confirm-publish') {
      options.confirmPublish = true;
      continue;
    }

    if (!next || next.startsWith('--')) {
      throw new Error(`Missing value for argument: ${arg}`);
    }

    if (arg === '--image') options.imagePath = next;
    else if (arg === '--image-url') options.imageUrl = next;
    else if (arg === '--board-id') options.boardId = next;
    else if (arg === '--title') options.title = next;
    else if (arg === '--description') options.description = next;
    else if (arg === '--alt-text') options.altText = next;
    else if (arg === '--link') options.link = next;
    else if (arg === '--board-section-id') options.boardSectionId = next;
    else if (arg === '--dominant-color') options.dominantColor = next;
    else if (arg === '--output') options.outputFile = next;
    else throw new Error(`Unknown argument: ${arg}`);

    index += 1;
  }

  return options;
}

function toPublishPinInput(options: CliOptions): PublishPinInput {
  const boardId = options.boardId ?? env.PINTEREST_DEFAULT_BOARD_ID;
  const boardSectionId = options.boardSectionId ?? env.PINTEREST_DEFAULT_BOARD_SECTION_ID;

  if (!boardId) {
    throw new Error('Pinterest board id is required. Use --board-id or PINTEREST_DEFAULT_BOARD_ID.');
  }

  return {
    boardId,
    title: options.title ?? '',
    description: options.description ?? '',
    altText: options.altText ?? '',
    imagePath: options.imagePath,
    imageUrl: options.imageUrl,
    link: options.link,
    boardSectionId,
    dominantColor: options.dominantColor,
  };
}

function redactBase64<T extends { media_source?: { source_type?: string; data?: string } }>(request: T): T {
  if (request.media_source?.source_type !== 'image_base64' || !request.media_source.data) {
    return request;
  }

  return {
    ...request,
    media_source: {
      ...request.media_source,
      data: `[base64 omitted, ${request.media_source.data.length} chars]`,
    },
  };
}

async function saveJson(filePath: string, data: unknown): Promise<void> {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  await writeFile(join(filePath), JSON.stringify(data, null, 2), 'utf-8');
}

main().catch(async (error) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  await logger.error(`publish-pin failed: ${message}`);
  console.error(`publish-pin failed: ${message}`);
  process.exit(1);
});
