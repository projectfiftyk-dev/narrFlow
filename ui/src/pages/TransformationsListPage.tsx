import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchTransformations } from '../api/transformations';
import { fetchBooks } from '../api/books';
import { StatusBadge } from '../components/StatusBadge';
import { useAppStore } from '../store/useAppStore';

export function TransformationsListPage() {
  const navigate = useNavigate();
  const activeId = useAppStore((s) => s.activeTransformationId);
  const setActiveTransformation = useAppStore((s) => s.setActiveTransformation);

  const { data: transformations = [], isLoading, isError } = useQuery({
    queryKey: ['transformations'],
    queryFn: fetchTransformations,
  });

  const { data: books = [] } = useQuery({ queryKey: ['books'], queryFn: fetchBooks });

  const bookTitle = (bookId: string) =>
    books.find((b) => b.id === bookId)?.title ?? bookId.slice(-8);

  const handlePlay = (id: string) => {
    setActiveTransformation(id);
    navigate('/player');
  };

  const handleContinue = (id: string) => {
    setActiveTransformation(id);
    navigate(`/new-transformation?resumeId=${id}`);
  };

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 26, color: '#1a202c' }}>Transformations</h1>
        <p style={{ margin: 0, color: '#718096', fontSize: 14 }}>
          All your transformations. Click one to make it active and view it in the Player.
        </p>
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
          No transformations yet. Create one from New Transformation.
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
                  gap: 16,
                  padding: '14px 18px',
                  background: '#fff',
                  border: `2px solid ${isActive ? '#667eea' : '#e2e8f0'}`,
                  borderRadius: 10,
                }}
              >
                {isActive && (
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#667eea',
                      flexShrink: 0,
                    }}
                  />
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: '#2d3748', fontSize: 14, marginBottom: 2 }}>
                    {bookTitle(t.bookId)}
                  </div>
                  <div style={{ color: '#a0aec0', fontSize: 12, fontFamily: 'monospace' }}>
                    {t.id.slice(-12)}
                  </div>
                </div>

                <StatusBadge status={t.status} />

                {t.status === 'DONE' ? (
                  <button
                    onClick={() => (isActive ? navigate('/player') : handlePlay(t.id))}
                    style={{
                      padding: '6px 14px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isActive ? 'Go to View' : 'Play'}
                  </button>
                ) : (
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
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
