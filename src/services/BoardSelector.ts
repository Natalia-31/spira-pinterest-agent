import { Board, BoardSelectionInput, BoardSelectionResult, BoardType } from '../types/Board.js';

const DEFAULT_BOARDS: Board[] = [
  {
    id: 'promotional-fashion-inspiration',
    name: 'Fashion Inspiration',
    type: 'promotional',
    keywords: ['capsule wardrobe', 'minimalist fashion', 'fashion inspiration', 'style inspiration', 'outfit inspiration'],
    description: 'Wide reach board for broad fashion discovery and impressions.',
  },
  {
    id: 'engagement-outfit-ideas',
    name: 'Outfit Ideas & Styling Guides',
    type: 'engagement',
    keywords: ['how to style', 'outfit ideas', 'capsule guide', 'ways to style', 'style guide', 'guide'],
    description: 'Educational board designed for saves and engagement.',
  },
  {
    id: 'sales-spira-shop',
    name: 'Shop SPIRA Looks',
    type: 'sales',
    keywords: ['linen pants', 'vest', 'dress', 'collection', 'shop', 'product', 'look'],
    description: 'Sales-focused board for product-led pins.',
  },
  {
    id: 'brand-spira-world',
    name: 'SPIRA Brand World',
    type: 'brand',
    keywords: ['spira', 'spira collection', 'behind the brand', 'brand story', 'atelier'],
    description: 'Brand board for SPIRA identity, story and collection launches.',
  },
];

const TYPE_PRIORITY: BoardType[] = ['brand', 'sales', 'engagement', 'promotional'];

export class BoardSelector {
  private boards: Board[];

  constructor(boards: Board[] = DEFAULT_BOARDS) {
    this.boards = boards;
  }

  select(input: BoardSelectionInput): BoardSelectionResult {
    const searchableText = this.toSearchableText(input);
    const scored = this.boards.map((board) => this.scoreBoard(board, searchableText));

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return TYPE_PRIORITY.indexOf(a.board.type) - TYPE_PRIORITY.indexOf(b.board.type);
    });

    const best = scored[0] ?? this.scoreBoard(this.boards[0], searchableText);

    return {
      board: best.board,
      boardType: best.board.type,
      score: best.score,
      reasons: best.reasons.length > 0 ? best.reasons : ['fallback: broad promotional content'],
    };
  }

  selectMany(inputs: BoardSelectionInput[]): BoardSelectionResult[] {
    return inputs.map((input) => this.select(input));
  }

  getBoards(): Board[] {
    return [...this.boards];
  }

  private scoreBoard(board: Board, searchableText: string): BoardSelectionResult {
    let score = 0;
    const reasons: string[] = [];

    for (const keyword of board.keywords) {
      if (searchableText.includes(keyword.toLowerCase())) {
        score += this.getKeywordWeight(board.type, keyword);
        reasons.push(`matched "${keyword}"`);
      }
    }

    return { board, boardType: board.type, score, reasons };
  }

  private getKeywordWeight(type: BoardType, keyword: string): number {
    if (type === 'brand' && keyword.includes('spira')) return 10;
    if (type === 'sales' && ['linen pants', 'vest', 'dress', 'collection'].includes(keyword)) return 8;
    if (type === 'engagement' && ['how to style', 'outfit ideas', 'capsule guide', 'ways to style'].includes(keyword)) return 7;
    return 5;
  }

  private toSearchableText(input: BoardSelectionInput): string {
    return [
      input.title,
      input.imageText,
      input.description,
      input.productType,
      input.mainKeyword,
      ...(input.hashtags ?? []),
      ...(input.relatedKeywords ?? []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
  }
}

export { DEFAULT_BOARDS };