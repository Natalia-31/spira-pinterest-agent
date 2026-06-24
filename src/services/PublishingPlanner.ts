import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { BoardSelector } from './BoardSelector.js';
import { BoardSelectionInput } from '../types/Board.js';
import {
  PinGoal,
  PublicationPlanItem,
  PublishingPinInput,
  PublishingPinType,
  PublishingPlannerConfig,
} from '../types/PublishingPlan.js';
import { logger } from '../utils/logger.js';

const DEFAULT_CONFIG: PublishingPlannerConfig = {
  accountAgeWeek: 1,
  pinsPerDayByWeek: {
    1: { min: 5, max: 10 },
    2: { min: 10, max: 20 },
    3: { min: 20, max: 30 },
  },
  startDate: new Date().toISOString().slice(0, 10),
  postingTimes: [
    '08:30',
    '10:15',
    '12:00',
    '14:30',
    '16:45',
    '18:30',
    '20:15',
    '21:45',
    '22:30',
    '23:10',
  ],
  outputFile: 'content/publishing/publication-plan.json',
  analyticsDir: 'content/analytics',
};

const GOAL_DISTRIBUTION: Array<{ value: PinGoal; weight: number }> = [
  { value: 'impressions', weight: 40 },
  { value: 'saves', weight: 25 },
  { value: 'clicks', weight: 25 },
  { value: 'sales', weight: 10 },
];

const PIN_TYPE_DISTRIBUTION: Array<{ value: PublishingPinType; weight: number }> = [
  { value: 'photo', weight: 35 },
  { value: 'photo_text', weight: 40 },
  { value: 'collage', weight: 10 },
  { value: 'video', weight: 10 },
  { value: 'experimental', weight: 5 },
];

export class PublishingPlanner {
  private config: PublishingPlannerConfig;
  private boardSelector: BoardSelector;

  constructor(config: Partial<PublishingPlannerConfig> = {}, boardSelector: BoardSelector = new BoardSelector()) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      pinsPerDayByWeek: config.pinsPerDayByWeek ?? DEFAULT_CONFIG.pinsPerDayByWeek,
      postingTimes: config.postingTimes ?? DEFAULT_CONFIG.postingTimes,
    };
    this.boardSelector = boardSelector;
  }

  async initialize(): Promise<void> {
    await this.ensureDir(dirname(this.config.outputFile));
    await this.ensureDir(this.config.analyticsDir);
    await this.prepareAnalyticsFiles();
  }

  async createPlan(pins: PublishingPinInput[]): Promise<PublicationPlanItem[]> {
    await this.initialize();

    const orderedPins = this.reorderPins(pins);
    const items = orderedPins.map((pin, index) => this.createPlanItem(pin, index, orderedPins.length));
    const balancedItems = this.fixConsecutiveConflicts(items);

    await writeFile(this.config.outputFile, JSON.stringify(balancedItems, null, 2), 'utf-8');
    await logger.info(`Publication plan created: ${this.config.outputFile}`);

    return balancedItems;
  }

  previewBoardSelection(pins: PublishingPinInput[]): Array<{
    pin: string;
    board: string;
    boardType: string;
    reasons: string[];
  }> {
    return pins.map((pin) => {
      const selection = this.boardSelector.select(this.toBoardInput(pin));
      return {
        pin: pin.title ?? pin.imageText ?? pin.mainKeyword ?? pin.pinFile,
        board: selection.board.name,
        boardType: selection.boardType,
        reasons: selection.reasons,
      };
    });
  }

  private createPlanItem(pin: PublishingPinInput, index: number, total: number): PublicationPlanItem {
    const boardSelection = this.boardSelector.select(this.toBoardInput(pin));
    const schedule = this.getSchedule(index);

    return {
      date: schedule.date,
      time: schedule.time,
      board: boardSelection.board.name,
      boardType: boardSelection.boardType,
      pinFile: pin.pinFile,
      pinType: this.normalizePinType(pin.pinType) ?? this.pickByDistribution(index, total, PIN_TYPE_DISTRIBUTION),
      pinGoal: pin.pinGoal ?? this.pickByDistribution(index, total, GOAL_DISTRIBUTION),
      productKey: this.getProductKey(pin),
      taskId: pin.taskId,
      status: 'planned',
    };
  }

  private getSchedule(index: number): { date: string; time: string } {
    const dailyRange = this.config.pinsPerDayByWeek[this.config.accountAgeWeek];
    const pinsPerDay = Math.min(this.config.postingTimes.length, Math.max(dailyRange.min, Math.floor((dailyRange.min + dailyRange.max) / 2)));
    const dayOffset = Math.floor(index / pinsPerDay);
    const time = this.config.postingTimes[index % pinsPerDay] ?? this.config.postingTimes[0];
    const date = new Date(`${this.config.startDate}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + dayOffset);

    return {
      date: date.toISOString().slice(0, 10),
      time,
    };
  }

  private fixConsecutiveConflicts(items: PublicationPlanItem[]): PublicationPlanItem[] {
    const result = [...items];

    for (let index = 1; index < result.length; index += 1) {
      const previous = result[index - 1];
      const current = result[index];

      if (
        previous.pinType === current.pinType ||
        previous.productKey === current.productKey ||
        previous.board === current.board
      ) {
        const swapIndex = result.findIndex((candidate, candidateIndex) => {
          if (candidateIndex <= index) return false;
          return (
            candidate.pinType !== previous.pinType &&
            candidate.productKey !== previous.productKey &&
            candidate.board !== previous.board
          );
        });

        if (swapIndex > index) {
          [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
        } else {
          result[index] = {
            ...current,
            pinType: this.nextPinType(current.pinType),
            pinGoal: this.nextGoal(current.pinGoal),
          };
        }
      }
    }

    return result;
  }

  private reorderPins(pins: PublishingPinInput[]): PublishingPinInput[] {
    const remaining = [...pins];
    const ordered: PublishingPinInput[] = [];

    while (remaining.length > 0) {
      const previous = ordered[ordered.length - 1];
      const nextIndex = remaining.findIndex((pin) => !previous || this.getProductKey(pin) !== this.getProductKey(previous));
      const selectedIndex = nextIndex >= 0 ? nextIndex : 0;
      const [selected] = remaining.splice(selectedIndex, 1);
      ordered.push(selected);
    }

    return ordered;
  }

  private toBoardInput(pin: PublishingPinInput): BoardSelectionInput {
    return {
      title: pin.title,
      imageText: pin.imageText,
      description: pin.description,
      hashtags: pin.hashtags,
      productType: pin.productType,
      mainKeyword: pin.mainKeyword,
      relatedKeywords: pin.relatedKeywords,
    };
  }

  private getProductKey(pin: PublishingPinInput): string {
    return (pin.productType ?? pin.mainKeyword ?? pin.title ?? pin.taskId).toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  private normalizePinType(pinType?: string): PublishingPinType | undefined {
    if (!pinType) return undefined;
    if (pinType === 'photo') return 'photo';
    if (pinType === 'photo_text') return 'photo_text';
    if (pinType === 'collage' || pinType === 'collage_text' || pinType === 'flat_lay') return 'collage';
    if (pinType === 'video') return 'video';
    if (pinType === 'experimental') return 'experimental';
    return undefined;
  }

  private pickByDistribution<T extends string>(
    index: number,
    total: number,
    distribution: Array<{ value: T; weight: number }>
  ): T {
    const position = Math.floor(((index + 0.5) / Math.max(total, 1)) * 100);
    let cumulative = 0;

    for (const item of distribution) {
      cumulative += item.weight;
      if (position < cumulative) return item.value;
    }

    return distribution[distribution.length - 1].value;
  }

  private nextPinType(pinType: PublishingPinType): PublishingPinType {
    const order: PublishingPinType[] = ['photo', 'photo_text', 'collage', 'video', 'experimental'];
    return order[(order.indexOf(pinType) + 1) % order.length];
  }

  private nextGoal(goal: PinGoal): PinGoal {
    const order: PinGoal[] = ['impressions', 'saves', 'clicks', 'sales'];
    return order[(order.indexOf(goal) + 1) % order.length];
  }

  private async prepareAnalyticsFiles(): Promise<void> {
    const files = ['impressions', 'saves', 'outbound_clicks', 'sales'];
    for (const file of files) {
      const filePath = join(this.config.analyticsDir, `${file}.json`);
      if (!existsSync(filePath)) {
        await writeFile(filePath, JSON.stringify([], null, 2), 'utf-8');
      }
    }
  }

  private async ensureDir(dir: string): Promise<void> {
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }
}

export { DEFAULT_CONFIG as DEFAULT_PUBLISHING_PLANNER_CONFIG };