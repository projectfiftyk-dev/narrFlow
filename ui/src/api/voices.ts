import { api } from './axios';
import type { Voice } from '../types';

export const fetchVoices = (): Promise<Voice[]> =>
  api.get('/voices').then((r) => r.data);
