export interface PinConfig {
  id: string;
  title: string;
  description: string;
  altText: string;
  fileName: string;
  boardId: string;
  boardName: string;
  pinType: PinType;
  imagePath: string;
  link?: string;
  hashtags: string[];
  metadata: PinMetadata;
}

export interface PinMetadata {
  createdAt: string;
  publishedAt?: string;
  imageAnalyzed: boolean;
  contentType: ContentType;
  productCategory?: string;
  seoScore: number;
  variations: PinVariation[];
}

export interface PinVariation {
  type: PinType;
  title: string;
  description: string;
  textOverlay: string;
  designStyle: DesignStyle;
}

export type PinType =
  | 'product-photo'
  | 'product-text'
  | 'collage'
  | 'collage-text'
  | 'flat-lay'
  | 'video'
  | 'text-only'
  | 'pinterest-style';

export type ContentType =
  | 'product'
  | 'lifestyle'
  | 'fashion'
  | 'inspiration'
  | 'tutorial'
  | 'brand';

export type BoardType =
  | 'promoting'
  | 'engaging'
  | 'selling'
  | 'brand';

export interface BoardConfig {
  id: string;
  name: string;
  type: BoardType;
  description: string;
  keywords: string[];
  seoTitle: string;
  seoDescription: string;
}

export interface DesignStyle {
  fonts: string[];
  colors: string[];
  layout: string;
  overlays: string[];
}

export interface ImageAnalysis {
  contentType: ContentType;
  productCategory?: string;
  dominantColors: string[];
  hasText: boolean;
  hasPeople: boolean;
  style: string;
  mood: string;
  recommendedPinTypes: PinType[];
}

export interface SEOResult {
  title: string;
  description: string;
  altText: string;
  fileName: string;
  keywords: string[];
  score: number;
}

export interface AnalyticsData {
  pinId: string;
  date: string;
  board: string;
  pinType: PinType;
  title: string;
  description: string;
  altText: string;
  imagePath: string;
  url?: string;
  impressions?: number;
  saves?: number;
  clicks?: number;
  ctr?: number;
}

export interface AgentConfig {
  brandName: string;
  brandDescription: string;
  targetAudience: string;
  websiteUrl: string;
  contentFolder: string;
  outputFolder: string;
  pinterestProfile: {
    name: string;
    description: string;
  };
}