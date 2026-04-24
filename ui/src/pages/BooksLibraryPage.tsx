import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchBooks } from '../api/books';
import { BookCard } from '../components/BookCard';

export function BooksLibraryPage() {
  const navigate = useNavigate();
  const { data: books, isLoading, isError } = useQuery({ queryKey: ['books'], queryFn: fetchBooks });

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 28, color: '#1a202c' }}>📚 Books Library</h1>
        <p style={{ margin: 0, color: '#718096' }}>Select a book to read or create a transformation</p>
      </div>

      {isLoading && (
        <div style={{ textAlign: 'center', color: '#a0aec0', padding: 60 }}>Loading books…</div>
      )}

      {isError && (
        <div style={{ background: '#fff5f5', color: '#c53030', padding: 16, borderRadius: 8 }}>
          Failed to load books. Make sure the API server is running.
        </div>
      )}

      {books && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 20,
          }}
        >
          {books.map((book) => (
            <BookCard key={book.id} book={book} onClick={(id) => navigate(`/books/${id}`)} />
          ))}
        </div>
      )}

      {books && books.length === 0 && (
        <div style={{ textAlign: 'center', color: '#a0aec0', padding: 60 }}>No books available yet.</div>
      )}
    </div>
  );
}
