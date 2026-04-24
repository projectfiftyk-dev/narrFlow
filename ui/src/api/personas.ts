import { api } from './axios';

export interface CreatedPersona {
  id: string;
  bookId: string;
  name: string;
  voiceId: string;
}

export interface CreatePersonaRequest {
  bookId: string;
  name: string;
  voiceId: string;
}

export const createPersona = (data: CreatePersonaRequest): Promise<CreatedPersona> =>
  api.post('/personas', data).then((r) => r.data);
