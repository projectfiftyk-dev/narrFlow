import { api } from './axios';
import type { Transformation, PagedResponse, TransformationVisibility } from '../types';

export interface TransformationListParams {
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'name';
  sortDir?: 'asc' | 'desc';
  page?: number;
  size?: number;
}

export const fetchTransformation = (id: string): Promise<Transformation> =>
  api.get(`/transformations/${id}`).then((r) => r.data);

export const fetchTransformations = (
  params?: TransformationListParams
): Promise<PagedResponse<Transformation>> =>
  api.get('/transformations', { params }).then((r) => r.data);

export const createTransformation = (bookId: string, name: string): Promise<Transformation> =>
  api.post('/transformations', { bookId, name }).then((r) => r.data);

export const saveVoiceMapping = (
  id: string,
  voiceMapping: Record<string, string>
): Promise<Transformation> =>
  api.put(`/transformations/${id}/voices`, { voiceMapping }).then((r) => r.data);

export const updateVisibility = (
  id: string,
  visibility: TransformationVisibility
): Promise<Transformation> =>
  api.patch(`/transformations/${id}/visibility`, { visibility }).then((r) => r.data);

export const triggerGeneration = (id: string): Promise<void> =>
  api.post(`/transformations/${id}/generate`).then(() => undefined);

export const deleteTransformation = (id: string): Promise<void> =>
  api.delete(`/transformations/${id}`).then(() => undefined);
