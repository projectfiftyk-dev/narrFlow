import { api } from './axios';
import type { Book, BookSection } from '../types';

export const fetchBooks = (): Promise<Book[]> =>
  api.get('/books').then((r) => r.data);

export const fetchBookSections = (bookId: string): Promise<BookSection[]> =>
  api.get(`/books/${bookId}/sections`).then((r) => r.data);
