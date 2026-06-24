export type PinterestImageContentType = 'image/jpeg' | 'image/png' | 'image/webp';

export interface PublishPinInput {
  boardId: string;
  title: string;
  description: string;
  altText: string;
  imagePath?: string;
  imageUrl?: string;
  link?: string;
  boardSectionId?: string;
  dominantColor?: string;
}

export interface PinterestImageBase64MediaSource {
  source_type: 'image_base64';
  content_type: PinterestImageContentType;
  data: string;
}

export interface PinterestImageUrlMediaSource {
  source_type: 'image_url';
  url: string;
}

export type PinterestMediaSource = PinterestImageBase64MediaSource | PinterestImageUrlMediaSource;

export interface PinterestCreatePinRequest {
  board_id: string;
  board_section_id?: string;
  title: string;
  description: string;
  alt_text: string;
  link?: string;
  dominant_color?: string;
  media_source: PinterestMediaSource;
}

export interface PinterestPinResponse {
  id: string;
  created_at?: string;
  link?: string;
  title?: string;
  description?: string;
  board_id?: string;
  board_section_id?: string;
  media?: unknown;
}

export interface PinterestPublisherConfig {
  accessToken?: string;
  apiBaseUrl?: string;
}
