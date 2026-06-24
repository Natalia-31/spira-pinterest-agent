export interface AiImageAnalysis {
  productType: string;
  visualDescription: string;
  style: string;
  colors: string[];
  audience: string;
  possibleBoards: string[];
  mainKeyword: string;
  relatedKeywords: string[];
  pinGoal: 'traffic' | 'saves' | 'clicks' | 'sales';
  recommendedPinTypes: string[];
}

export interface AiAnalysisResult {
  taskId: string;
  imagePath: string;
  analysis: AiImageAnalysis;
  createdAt: string;
}