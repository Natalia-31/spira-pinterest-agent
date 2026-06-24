export interface ImageTask {
  id: string;
  imagePath: string;
  fileName: string;
  createdAt: string;
}

export interface ImageAnalysisResult {
  id: string;
  image: string;
  fileName: string;
  width: number;
  height: number;
  orientation: 'horizontal' | 'vertical' | 'square';
  format: string;
  status: 'pending' | 'analyzed' | 'content_generated' | 'planned' | 'error';
  createdAt: string;
  analyzedAt?: string;
  error?: string;
}