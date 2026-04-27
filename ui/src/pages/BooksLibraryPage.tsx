import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchBooks, createBook, type BookListParams } from '../api/books';
import { BookCard } from '../components/BookCard';
import { useRole } from '../features/auth/useRole';

const GRADIENT = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

const SORT_OPTIONS = [
  { label: 'Newest first', sortBy: 'createdAt' as const, sortDir: 'desc' as const },
  { label: 'Oldest first', sortBy: 'createdAt' as const, sortDir: 'asc' as const },
  { label: 'Title A–Z', sortBy: 'title' as const, sortDir: 'asc' as const },
  { label: 'Title Z–A', sortBy: 'title' as const, sortDir: 'desc' as const },
];

const SAMPLE_SECTIONS = JSON.stringify(
  [
    {
      sectionId: 'ch1',
      sectionName: 'Chapter 1',
      content: [
        { author: 'Narrator', text: 'Once upon a time...' },
        { author: 'Alice', text: 'Hello, world!' },
      ],
    },
  ],
  null,
  2
);

function BookCardSkeleton() {
  return (
    <div
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: 24,
        background: '#fff',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 6,
          background: '#e2e8f0',
          marginBottom: 14,
          animation: 'skeleton-pulse 1.6s ease-in-out infinite',
        }}
      />
      <div
        style={{
          height: 17,
          width: '70%',
          background: '#e2e8f0',
          borderRadius: 4,
          marginBottom: 10,
          animation: 'skeleton-pulse 1.6s ease-in-out infinite',
        }}
      />
      <div
        style={{
          height: 13,
          width: '50%',
          background: '#edf2f7',
          borderRadius: 4,
          animation: 'skeleton-pulse 1.6s ease-in-out infinite',
        }}
      />
    </div>
  );
}

function CreateBookModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [version, setVersion] = useState('');
  const [sectionsJson, setSectionsJson] = useState(SAMPLE_SECTIONS);
  const [jsonError, setJsonError] = useState('');

  const mutation = useMutation({
    mutationFn: () => {
      let sections: unknown[];
      try {
        sections = JSON.parse(sectionsJson);
      } catch {
        throw new Error('INVALID_JSON');
      }
      return createBook({ title, version: version || undefined, sections });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      onClose();
    },
    onError: (err: Error) => {
      if (err.message === 'INVALID_JSON') setJsonError('Invalid JSON — check the sections format.');
    },
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 32,
          width: '100%',
          maxWidth: 560,
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 20, color: '#1a202c' }}>Add New Book</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#a0aec0', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4a5568', marginBottom: 6 }}>
            Title <span style={{ color: '#c53030' }}>*</span>
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Pride and Prejudice"
            style={{
              width: '100%',
              padding: '9px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              fontSize: 14,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4a5568', marginBottom: 6 }}>
            Version <span style={{ color: '#a0aec0', fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="1.0"
            style={{
              width: '100%',
              padding: '9px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              fontSize: 14,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4a5568', marginBottom: 6 }}>
            Sections JSON <span style={{ color: '#c53030' }}>*</span>
          </label>
          <p style={{ margin: '0 0 8px', fontSize: 12, color: '#718096' }}>
            Array of <code style={{ background: '#f7fafc', padding: '1px 4px', borderRadius: 3 }}>{'{ sectionId, sectionName, content: [{ author, text }] }'}</code>
          </p>
          <textarea
            value={sectionsJson}
            onChange={(e) => { setSectionsJson(e.target.value); setJsonError(''); }}
            rows={10}
            style={{
              width: '100%',
              padding: '9px 12px',
              border: `1px solid ${jsonError ? '#c53030' : '#e2e8f0'}`,
              borderRadius: 8,
              fontSize: 12,
              fontFamily: 'monospace',
              outline: 'none',
              boxSizing: 'border-box',
              resize: 'vertical',
            }}
          />
          {jsonError && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#c53030' }}>{jsonError}</p>}
        </div>

        {mutation.isError && !jsonError && (
          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#c53030' }}>
            Failed to create book. Check that the backend is running.
          </p>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '9px 20px',
              background: '#f7fafc',
              color: '#4a5568',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!title.trim() || mutation.isPending}
            style={{
              padding: '9px 20px',
              background: title.trim() ? GRADIENT : '#e2e8f0',
              color: title.trim() ? '#fff' : '#a0aec0',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: title.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            {mutation.isPending ? 'Creating…' : 'Create Book'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function BooksLibraryPage() {
  const navigate = useNavigate();
  const role = useRole();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sortIdx, setSortIdx] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Debounce: trigger search 0.5s after typing stops
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 500);
    return () => clearTimeout(t);
  }, [searchInput]);

  const params: BookListParams = {
    search: search || undefined,
    sortBy: SORT_OPTIONS[sortIdx].sortBy,
    sortDir: SORT_OPTIONS[sortIdx].sortDir,
    size: 50,
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['books', params],
    queryFn: () => fetchBooks(params),
    // Don't retry 401 — guest can't access books
    retry: (count, err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 403) return false;
      return count < 1;
    },
  });

  const is401 = (error as { response?: { status?: number } })?.response?.status === 401
    || (error as { response?: { status?: number } })?.response?.status === 403;

  const books = data?.items ?? [];

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 0, gap: 16, flexWrap: 'wrap', paddingBottom: 20, borderBottom: '2px solid #e2e8f0' }}>
        <div>
          <h1 style={{ margin: '0 0 6px', fontSize: 26, color: '#1a202c' }}>📚 Books Library</h1>
          <p style={{ margin: 0, color: '#718096', fontSize: 14 }}>
            {role === 'GUEST' ? 'Browse the book collection.' : 'Select a book to start a transformation.'}
          </p>
        </div>
        {role === 'ADMIN' && (
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '9px 18px',
              background: GRADIENT,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            + Add Book
          </button>
        )}
      </div>

      {/* Search + sort bar */}
      <div style={{ display: 'flex', gap: 10, marginTop: 20, marginBottom: 0, paddingBottom: 20, borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
        {/* Search bubble */}
        <div
          style={{
            flex: 1,
            minWidth: 180,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 100,
            padding: '6px 14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <span style={{ color: '#a0aec0', fontSize: 12 }}>🔍</span>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search books…"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: 13,
              background: 'transparent',
              color: '#2d3748',
            }}
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#a0aec0',
                fontSize: 14,
                padding: 0,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Sort select */}
        <select
          value={sortIdx}
          onChange={(e) => setSortIdx(Number(e.target.value))}
          style={{
            padding: '6px 4px',
            background: 'transparent',
            border: 'none',
            fontSize: 13,
            color: '#4a5568',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          {SORT_OPTIONS.map((o, i) => (
            <option key={i} value={i}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Guest 401 */}
      {is401 && (
        <div
          style={{
            marginTop: 28,
            background: '#fffbeb',
            border: '1px solid #f6e05e',
            borderRadius: 10,
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#975a16' }}>Sign in to browse books</p>
            <p style={{ margin: 0, fontSize: 13, color: '#b7791f' }}>Books are only visible to signed-in users.</p>
          </div>
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '9px 18px',
              background: GRADIENT,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Sign In
          </button>
        </div>
      )}

      {isLoading && (
        <div
          style={{
            marginTop: 28,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 20,
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <BookCardSkeleton key={i} />
          ))}
        </div>
      )}

      {isError && !is401 && (
        <div style={{ marginTop: 28, background: '#fff5f5', color: '#c53030', padding: 16, borderRadius: 8 }}>
          Failed to load books. Make sure the API server is running.
        </div>
      )}

      {!isLoading && !isError && books.length === 0 && (
        <div style={{ textAlign: 'center', color: '#a0aec0', padding: 60 }}>
          {search ? `No books match "${search}"` : 'No books available yet.'}
        </div>
      )}

      {books.length > 0 && (
        <>
          <div
            style={{
              marginTop: 28,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 20,
            }}
          >
            {books.map((book) => (
              <BookCard key={book.id} book={book} onClick={(id) => navigate(`/books/${id}`)} />
            ))}
          </div>
          {data && data.totalElements > books.length && (
            <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#a0aec0' }}>
              Showing {books.length} of {data.totalElements} books
            </p>
          )}
        </>
      )}

      {showCreateModal && <CreateBookModal onClose={() => setShowCreateModal(false)} />}
    </div>
  );
}
