import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  PINTEREST_ACCESS_TOKEN: z.string().optional(),
  PINTEREST_DEFAULT_BOARD_ID: z.string().optional(),
  PINTEREST_DEFAULT_BOARD_SECTION_ID: z.string().optional(),
  CONTENT_NEW_DIR: z.string().default('content/new'),
  CONTENT_PROCESSED_DIR: z.string().default('content/processed'),
  CONTENT_PUBLISHED_DIR: z.string().default('content/published'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Environment validation failed:');
  parsed.error.issues.forEach((issue) => {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

export const env = parsed.data;