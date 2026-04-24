import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginPage } from './pages/LoginPage';
import { BooksLibraryPage } from './pages/BooksLibraryPage';
import { BookViewerPage } from './pages/BookViewerPage';
import { NewTransformationPage } from './pages/NewTransformationPage';
import { TransformationsListPage } from './pages/TransformationsListPage';
import { PlayerPage } from './pages/PlayerPage';
import { AppLayout } from './components/AppLayout';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/books" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/books"
        element={
          <AppLayout>
            <BooksLibraryPage />
          </AppLayout>
        }
      />
      <Route
        path="/books/:bookId"
        element={
          <AppLayout>
            <BookViewerPage />
          </AppLayout>
        }
      />
      <Route
        path="/new-transformation"
        element={
          <AppLayout>
            <NewTransformationPage />
          </AppLayout>
        }
      />
      <Route
        path="/transformations"
        element={
          <AppLayout>
            <TransformationsListPage />
          </AppLayout>
        }
      />
      <Route
        path="/player"
        element={
          <AppLayout>
            <PlayerPage />
          </AppLayout>
        }
      />
      <Route path="*" element={<Navigate to="/books" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
