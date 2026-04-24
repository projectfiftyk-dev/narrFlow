import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginPage } from './pages/LoginPage';
import { BooksLibraryPage } from './pages/BooksLibraryPage';
import { BookViewerPage } from './pages/BookViewerPage';
import { TransformationBuilderPage } from './pages/TransformationBuilderPage';
import { PlayerPage } from './pages/PlayerPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/books" element={<BooksLibraryPage />} />
          <Route path="/books/:bookId" element={<BookViewerPage />} />
          <Route path="/transformations/:bookId" element={<TransformationBuilderPage />} />
          <Route path="/content/:contentId" element={<PlayerPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
