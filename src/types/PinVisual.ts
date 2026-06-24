export interface GeneratedPin {
  file: string;
  type: string;
  headline: string;
  cta: string;
}

export interface PinVisualResult {
  taskId: string;
  imagePath: string;
  generatedPins: GeneratedPin[];
  createdAt: string;
}