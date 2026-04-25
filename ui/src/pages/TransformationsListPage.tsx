import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  fetchTransformations,
  updateVisibility,
  type TransformationListParams,
} from '../api/transformations';
import { fetchBooks } from '../api/books';
import { StatusBadge } from '../components/StatusBadge';
import { useAppStore } from '../store/useAppStore';
import { useRole } from '../features/auth/useRole';
import type { Transformation } from '../types';

const GRADIENT = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

const SORT_OPTIONS = [
  { label: 'Recently updated', sortBy: 'updatedAt' as const, sortDir: 'desc' as const },
  { label: 'Recently created', sortBy: 'createdAt' as const, sortDir: 'desc' as const },
  { label: 'Oldest first', sortBy: 'createdAt' as const, sortDir: 'asc' as const },
  { label: 'Name A–Z', sortBy: 'name' as const, sortDir: 'asc' as const },
  { label: 'Name Z–A', sortBy: 'name' as const, sortDir: 'desc' as const },
];

function VisibilityToggle({ transformation }: { transformation: Transformation }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () =>
      updateVisibility(
        transformation.id,
        transformation.visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC'
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transformations'] }),
  });

  const isPublic = transformation.visibility === 'PUBLIC';
  return (
    <button
      onClick={(e) => { e.stopPropagation(); mutation.mutate(); }}
      disabled={mutation.isPending}
      title={isPublic ? 'Make private' : 'Make public'}
      style={{
        padding: '4px 10px',
        background: isPublic ? '#f0fff4' : '#f7fafc',
        color: isPublic ? '#276749' : '#718096',
        border: `1px solid ${isPublic ? '#9ae6b4' : '#e2e8f0'}`,
        borderRadius: 100,
        fontSize: 11,
        fontWeight: 600,
        cursor: mutation.isPending ? 'not-allowed' : 'pointer',
        whiteSpace: 'nowrap',
        opacity: mutation.isPending ? 0.6 : 1,
      }}
    >
      {isPublic ? '🌐 Public' : '🔒 Private'}
    </button>
  );
}

export function TransformationsListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const activeId = useAppStore((s) => s.activeTransformationId);
  const setActiveTransformation = useAppStore((s) => s.setActiveTransformation);
  const role = useRole();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sortIdx, setSortIdx] = useState(0);

  // Debounce 0.5s
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 500);
    return () => clearTimeout(t);
  }, [searchInput]);

  const params: TransformationListParams = {
    search: search || undefined,
    sortBy: SORT_OPTIONS[sortIdx].sortBy,
    sortDir: SORT_OPTIONS[sortIdx].sortDir,
    size: 50,
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['transformations', params],
    queryFn: () => fetchTransformations(params),
  });

  const { data: booksData } = useQuery({
    queryKey: ['books', { size: 100 }],
    queryFn: () => fetchBooks({ size: 100 }),
    retry: false,
  });

  const transformations = data?.items ?? [];
  const books = booksData?.items ?? [];

  const bookTitle = (bookId: string) =>
    books.find((b) => b.id === bookId)?.title ?? `…${bookId.slice(-8)}`;

  const handlePlay = (id: string) => {
    setActiveTransformation(id);
    navigate('/player');
  };

  const handleContinue = (id: string) => {
    setActiveTransformation(id);
    navigate(`/new-transformation?resumeId=${id}`);
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 26, color: '#1a202c' }}>🎭 Transformations</h1>
        <p style={{ margin: 0, color: '#718096', fontSize: 14 }}>
          {role === 'GUEST'
            ? 'Public transformations available to listen.'
            : 'Your audiobook transformations. Select one to play or continue.'}
        </p>
      </div>

      {/* Search + sort */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <div
          style={{
            flex: 1,
            minWidth: 200,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 100,
            padding: '8px 16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <span style={{ color: '#a0aec0', fontSize: 14 }}>🔍</span>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search transformations…"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: 14,
              background: 'transparent',
              color: '#2d3748',
            }}
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a0aec0', fontSize: 14, padding: 0 }}
            >
              ✕
            </button>
          )}
        </div>

        <select
          value={sortIdx}
          onChange={(e) => setSortIdx(Number(e.target.value))}
          style={{
            padding: '8px 14px',
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 100,
            fontSize: 13,
            color: '#4a5568',
            cursor: 'pointer',
            outline: 'none',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          {SORT_OPTIONS.map((o, i) => (
            <option key={i} value={i}>{o.label}</option>
          ))}
        </select>

        {role !== 'GUEST' && (
          <button
            onClick={() => navigate('/new-transformation')}
            style={{
              padding: '8px 16px',
              background: GRADIENT,
              color: '#fff',
              border: 'none',
              borderRadius: 100,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            + New
          </button>
        )}
      </div>

      {isLoading && (
        <div style={{ textAlign: 'center', color: '#a0aec0', padding: 60 }}>Loading…</div>
      )}

      {isError && (
        <div style={{ background: '#fff5f5', color: '#c53030', padding: 16, borderRadius: 8 }}>
          Failed to load transformations.
        </div>
      )}

      {!isLoading && !isError && transformations.length === 0 && (
        <div style={{ textAlign: 'center', color: '#a0aec0', padding: 60, fontSize: 14 }}>
          {search
            ? `No transformations match "${search}"`
            : role === 'GUEST'
            ? 'No public transformations available yet.'
            : 'No transformations yet — create one from New Transformation.'}
        </div>
      )}

      {transformations.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {transformations.map((t) => {
            const isActive = t.id === activeId;
            return (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 18px',
                  background: '#fff',
                  border: `2px solid ${isActive ? '#667eea' : '#e2e8f0'}`,
                  borderRadius: 10,
                  flexWrap: 'wrap',
                }}
              >
                {isActive && (
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#667eea', flexShrink: 0 }} />
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: '#2d3748', fontSize: 14, marginBottom: 2 }}>
                    {t.name || bookTitle(t.bookId)}
                  </div>
                  <div style={{ color: '#a0aec0', fontSize: 12 }}>
                    {t.name && books.length > 0 && (
                      <span style={{ marginRight: 6 }}>{bookTitle(t.bookId)} · </span>
                    )}
                    <span style={{ fontFamily: 'monospace' }}>{t.id.slice(-10)}</span>
                  </div>
                </div>

                <StatusBadge status={t.status} />

                {/* Visibility toggle for authenticated owners */}
                {role !== 'GUEST' && t.visibility !== undefined && (
                  <VisibilityToggle transformation={t} />
                )}

                {t.status === 'DONE' ? (
                  <button
                    onClick={() => (isActive ? navigate('/player') : handlePlay(t.id))}
                    style={{
                      padding: '6px 14px',
                      background: GRADIENT,
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isActive ? 'Go to Player' : 'Play'}
                  </button>
                ) : role !== 'GUEST' ? (
                  <button
                    onClick={() => handleContinue(t.id)}
                    style={{
                      padding: '6px 14px',
                      background: '#fefcbf',
                      color: '#975a16',
                      border: '1px solid #f6e05e',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Continue
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {data && data.totalElements > transformations.length && (
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#a0aec0' }}>
          Showing {transformations.length} of {data.totalElements}
        </p>
      )}
    </div>
  );
}
