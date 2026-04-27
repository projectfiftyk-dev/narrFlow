import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  fetchTransformations,
  updateVisibility,
  deleteTransformation,
  type TransformationListParams,
} from '../api/transformations';
import { fetchBooks } from '../api/books';
import { StatusBadge } from '../components/StatusBadge';
import { useAppStore } from '../store/useAppStore';
import { useRole } from '../features/auth/useRole';
import type { Transformation } from '../types';

const GRADIENT = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

const SORT_OPTIONS = [
  { label: 'Newest first', sortBy: 'createdAt' as const, sortDir: 'desc' as const },
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

function TransformationCard({
  transformation: t,
  isActive,
  bookTitle,
  role,
  onPlay,
  onContinue,
  onGoToPlayer,
}: {
  transformation: Transformation;
  isActive: boolean;
  bookTitle: string;
  role: string;
  onPlay: () => void;
  onContinue: () => void;
  onGoToPlayer: () => void;
}) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => deleteTransformation(t.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transformations'] }),
  });

  return (
    <div
      style={{
        background: '#fff',
        border: `2px solid ${isActive ? '#667eea' : '#e2e8f0'}`,
        borderRadius: 10,
        padding: '16px 20px',
      }}
    >
      {/* Top row: title left · status + visibility right */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isActive && (
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#667eea', flexShrink: 0, marginTop: 1 }} />
            )}
            <span style={{ fontWeight: 700, color: '#1a202c', fontSize: 15, lineHeight: 1.3 }}>
              {t.name || bookTitle}
            </span>
          </div>
          <div style={{ color: '#a0aec0', fontSize: 12, marginTop: 3, paddingLeft: isActive ? 15 : 0 }}>
            {t.name && <span style={{ marginRight: 4 }}>{bookTitle} ·</span>}
            <span style={{ fontFamily: 'monospace' }}>{t.id.slice(-10)}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <StatusBadge status={t.status} />
          {role !== 'GUEST' && t.visibility !== undefined && (
            <VisibilityToggle transformation={t} />
          )}
        </div>
      </div>

      {/* Bottom row: primary action left · delete right */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, gap: 8 }}>
        <div>
          {t.status === 'DONE' ? (
            <button
              onClick={isActive ? onGoToPlayer : onPlay}
              style={{
                padding: '6px 16px',
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
              onClick={onContinue}
              style={{
                padding: '6px 16px',
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

        {role !== 'GUEST' && (
          <button
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            style={{
              padding: '6px 14px',
              background: 'transparent',
              color: '#e53e3e',
              border: '1px solid #feb2b2',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: deleteMutation.isPending ? 'not-allowed' : 'pointer',
              opacity: deleteMutation.isPending ? 0.6 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
          </button>
        )}
      </div>
    </div>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {transformations.map((t) => {
            const isActive = t.id === activeId;
            return (
              <TransformationCard
                key={t.id}
                transformation={t}
                isActive={isActive}
                bookTitle={bookTitle(t.bookId)}
                role={role}
                onPlay={() => handlePlay(t.id)}
                onContinue={() => handleContinue(t.id)}
                onGoToPlayer={() => navigate('/player')}
              />
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
