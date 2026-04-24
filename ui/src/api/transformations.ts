import { api } from './axios';
import type { Transformation } from '../types';

export const fetchTransformation = (id: string): Promise<Transformation> =>
  api.get(`/transformations/${id}`).then((r) => r.data);

export const fetchTransformations = (): Promise<Transformation[]> =>
  api.get('/transformations').then((r) => r.data);

export const createTransformation = (bookId: string): Promise<Transformation> =>
  api.post('/transformations', { bookId }).then((r) => r.data);

export const saveVoiceMapping = (
  id: string,
  voiceMapping: Record<string, string>
): Promise<Transformation> =>
  api.put(`/transformations/${id}/voices`, { voiceMapping }).then((r) => r.data);

export const triggerGeneration = (id: string): Promise<void> =>
  api.post(`/transformations/${id}/generate`).then(() => undefined);
