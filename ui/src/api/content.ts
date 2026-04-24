import { api } from './axios';
import type { Content } from '../types';

export const fetchContent = (transformationId: string): Promise<Content> =>
  api.get(`/content/${transformationId}`).then((r) => r.data);
