export interface PinContent {
  title: string;
  imageText: string;
  description: string;
  altText: string;
  hashtags: string[];
  seoFileName: string;
  boardType: 'promotional' | 'engagement' | 'sales' | 'brand';
  pinType: 'photo' | 'photo_text' | 'collage' | 'flat_lay' | 'video' | 'text_only' | 'experimental';
  pinGoal: 'impressions' | 'saves' | 'clicks' | 'sales';
}

export interface PinContentResult {
  taskId: string;
  imagePath: string;
  content: PinContent;
  createdAt: string;
}