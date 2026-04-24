import { api } from './axios';
import type { Transformation, PersonaMapping } from '../types';

export const fetchTransformation = (id: string): Promise<Transformation> =>
  api.get(`/transformations/${id}`).then((r) => r.data);

export const fetchTransformationsForBook = (bookId: string): Promise<Transformation[]> =>
  api.get(`/transformations?bookId=${bookId}`).then((r) => r.data);

export const createTransformation = (bookId: string): Promise<Transformation> =>
  api.post('/transformations', { bookId }).then((r) => r.data);

export const savePersonaMapping = (
  id: string,
  personaMapping: PersonaMapping
): Promise<Transformation> =>
  api.put(`/transformations/${id}/personas`, { personaMapping }).then((r) => r.data);

export const triggerGeneration = (id: string): Promise<Transformation> =>
  api.post(`/transformations/${id}/generate`).then((r) => r.data);
