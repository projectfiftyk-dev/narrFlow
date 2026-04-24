export interface Book {
  id: string;
  title: string;
  author?: string;
  description?: string;
}

// Shape returned by GET /api/v1/books/{bookId}/sections
export interface SectionContent {
  text: string;
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
  | 'PERSONA_ASSIGNMENT'
  | 'GENERATING'
  | 'DONE'
  | 'FAILED';

export interface PersonaMapping {
  [sectionId: string]: string; // sectionId -> voiceId
}

export interface Transformation {
  id: string;
  userId: string;
  bookId: string;
  personaMapping: PersonaMapping;
  status: TransformationStatus;
}

export interface ContentItem {
  sectionId: string;
  text: string;
  audioUri: string;
  personaId: string;
}

export interface Content {
  contentId: string;
  bookId: string;
  transformationId: string;
  items: ContentItem[];
}
