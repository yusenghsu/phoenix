export interface CarouselSlide {
  pageNumber: number;
  title: string;
  content: string;
  bulletPoints?: string[];
}

export interface CarouselOutput {
  coverTitle: string;
  coverSubtitle: string;
  slides: CarouselSlide[];
  cta: string;
  caption: string;
  hashtags: string[];
  canvaContent: string;
}

export interface GenerateRequest {
  topic: string;
  style?: "professional" | "casual" | "educational";
  slideCount?: number;
}

export interface GenerateResponse {
  success: boolean;
  data?: CarouselOutput;
  error?: string;
}
