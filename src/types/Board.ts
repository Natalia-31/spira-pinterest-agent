export type BoardType = 'promotional' | 'engagement' | 'sales' | 'brand';

export interface Board {
  id: string;
  name: string;
  type: BoardType;
  keywords: string[];
  description: string;
}

export interface BoardSelectionInput {
  title?: string;
  imageText?: string;
  description?: string;
  hashtags?: string[];
  productType?: string;
  mainKeyword?: string;
  relatedKeywords?: string[];
}

export interface BoardSelectionResult {
  board: Board;
  boardType: BoardType;
  score: number;
  reasons: string[];
}