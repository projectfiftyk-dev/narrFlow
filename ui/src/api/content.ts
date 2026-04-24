import { api } from './axios';
import type { Content } from '../types';

export const fetchContent = (contentId: string): Promise<Content> =>
  api.get(`/content/${contentId}`).then((r) => r.data);
