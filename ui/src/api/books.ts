import { api } from './axios';
import type { Book, BookSection, PagedResponse } from '../types';

export interface BookListParams {
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  sortDir?: 'asc' | 'desc';
  page?: number;
  size?: number;
}

export const fetchBooks = (params?: BookListParams): Promise<PagedResponse<Book>> =>
  api.get('/books', { params }).then((r) => r.data);

export const fetchBookSections = (
  bookId: string,
  params?: { search?: string; page?: number; size?: number }
): Promise<PagedResponse<BookSection>> =>
  api.get(`/books/${bookId}/sections`, { params }).then((r) => r.data);

export const createBook = (data: {
  title: string;
  version?: string;
  sections: unknown[];
}): Promise<Book> => api.post('/books', data).then((r) => r.data);
