export interface Book {
  id: string;
  title: string;
  author?: string;
  description?: string;
}

export interface SectionContent {
  text: string;
  author: string;
}

export interface BookSection {
  sectionId: string;
  sectionName: string;
  content: SectionContent[];
}

export interface Voice {
  id: string;
  slug: string;
  friendlyName: string;
  description?: string;
}

export type TransformationStatus =
  | 'DRAFT'
  | 'VOICE_ASSIGNMENT'
  | 'GENERATING'
  | 'DONE'
  | 'FAILED';

export interface Transformation {
  id: string;
  userId: string;
  bookId: string;
  status: TransformationStatus;
  voiceMapping?: Record<string, string>; // author -> voiceId
  ttsTaskId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContentItem {
  sectionId: string;
  sectionName: string;
  author: string;
  text: string;
  audioUri: string;
  voiceId: string;
}

export interface Content {
  id: string;
  bookId: string;
  transformationId: string;
  items: ContentItem[];
}
