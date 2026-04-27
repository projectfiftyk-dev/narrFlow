import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchBooks, fetchBookSections } from '../api/books';
import { useRole } from '../features/auth/useRole';

const GRADIENT = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

function SectionSkeleton() {
  return (
    <div style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #edf2f7' }}>
      <div
        style={{
          height: 20,
          width: '45%',
          background: '#e2e8f0',
          borderRadius: 4,
          animation: 'skeleton-pulse 1.6s ease-in-out infinite',
        }}
      />
    </div>
  );
}

function SectionContent({ content }: { content: { text: string; author: string }[] }) {
  return (
    <div style={{ paddingTop: 16, paddingBottom: 24 }}>
      {content.map((para, pIdx) => (
        <div key={pIdx} style={{ marginBottom: 20 }}>
          <span
            style={{
              display: 'block',
              fontSize: 10,
              fontWeight: 700,
              color: '#9f7aea',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: 4,
            }}
          >
            {para.author}
          </span>
          <p
            style={{
              margin: 0,
              color: '#2d3748',
              lineHeight: 1.85,
              fontSize: 15,
              fontFamily: 'Georgia, "Times New Roman", serif',
            }}
          >
            {para.text}
          </p>
        </div>
      ))}
    </div>
  );
}

export function BookViewerPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const role = useRole();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data: booksData } = useQuery({
    queryKey: ['books', { size: 100 }],
    queryFn: () => fetchBooks({ size: 100 }),
    retry: false,
  });
  const book = booksData?.items?.find((b) => b.id === bookId);

  const {
    data: sectionsData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['sections', bookId],
    queryFn: () => fetchBookSections(bookId!, { size: 200 }),
    enabled: !!bookId,
  });

  const sections = sectionsData?.items ?? [];

  useEffect(() => {
    if (sections.length) {
      setExpanded(Object.fromEntries(sections.map((s) => [s.sectionId, true])));
    }
  }, [sections.length]);

  const toggle = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div style={{ maxWidth: '70%', margin: '0 auto', padding: '40px 24px' }}>
      {isLoading && (
        <>
          <div style={{ height: 28, width: 240, background: '#e2e8f0', borderRadius: 6, marginBottom: 32, animation: 'skeleton-pulse 1.6s ease-in-out infinite' }} />
          {Array.from({ length: 5 }).map((_, i) => (
            <SectionSkeleton key={i} />
          ))}
        </>
      )}

      {isError && (
        <div style={{ background: '#fff5f5', color: '#c53030', padding: 16, borderRadius: 8 }}>
          <strong>Failed to load sections.</strong>
          {error instanceof Error && (
            <pre style={{ margin: '8px 0 0', fontSize: 12, whiteSpace: 'pre-wrap', opacity: 0.8 }}>
              {error.message}
            </pre>
          )}
        </div>
      )}

      {sectionsData && (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 32,
              gap: 16,
              flexWrap: 'wrap',
              paddingBottom: 20,
              borderBottom: '2px solid #e2e8f0',
            }}
          >
            <h1 style={{ margin: 0, fontSize: 26, color: '#1a202c' }}>
              📖 {book?.title ?? 'Book'}
            </h1>
            {role !== 'GUEST' && (
              <button
                onClick={() => navigate(`/new-transformation?bookId=${bookId}`)}
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
                ✨ Transform
              </button>
            )}
          </div>

          {sections.length === 0 && (
            <div style={{ color: '#a0aec0', padding: '40px 0', textAlign: 'center' }}>
              No sections found for this book.
            </div>
          )}

          {sections.map((section) => (
            <div key={section.sectionId} style={{ borderBottom: '1px solid #edf2f7' }}>
              <button
                onClick={() => toggle(section.sectionId)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  padding: '14px 0',
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#2d3748',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>{section.sectionName}</span>
                <span style={{ color: '#a0aec0', fontSize: 11 }}>
                  {expanded[section.sectionId] ? '▲' : '▼'}
                </span>
              </button>

              {expanded[section.sectionId] && (
                <SectionContent content={section.content} />
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
