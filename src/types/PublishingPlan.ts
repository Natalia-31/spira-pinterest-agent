import { BoardType } from './Board.js';

export type PinGoal = 'impressions' | 'saves' | 'clicks' | 'sales';
export type PublishingPinType = 'photo' | 'photo_text' | 'collage' | 'video' | 'experimental';

export interface DailyPinRange {
  min: number;
  max: number;
}

export interface PublishingPlannerConfig {
  accountAgeWeek: 1 | 2 | 3;
  pinsPerDayByWeek: Record<1 | 2 | 3, DailyPinRange>;
  startDate: string;
  postingTimes: string[];
  outputFile: string;
  analyticsDir: string;
}

export interface PublicationPlanItem {
  date: string;
  time: string;
  board: string;
  boardType: BoardType;
  pinFile: string;
  pinType: PublishingPinType;
  pinGoal: PinGoal;
  productKey: string;
  taskId: string;
  status: 'planned';
}

export interface PublishingPinInput {
  taskId: string;
  pinFile: string;
  pinType?: PublishingPinType | string;
  pinGoal?: PinGoal;
  title?: string;
  imageText?: string;
  description?: string;
  hashtags?: string[];
  productType?: string;
  mainKeyword?: string;
  relatedKeywords?: string[];
}

export interface PublishingPlan {
  generatedAt: string;
  config: PublishingPlannerConfig;
  items: PublicationPlanItem[];
}