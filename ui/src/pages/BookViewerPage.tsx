import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { fetchBooks, fetchBookSections } from '../api/books';

export function BookViewerPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Get book title from the already-cached library list
  const { data: books } = useQuery({ queryKey: ['books'], queryFn: fetchBooks });
  const book = books?.find((b) => b.id === bookId);

  const {
    data: sections,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['sections', bookId],
    queryFn: () => fetchBookSections(bookId!),
    enabled: !!bookId,
  });

  // Auto-expand all sections once data arrives
  useEffect(() => {
    if (sections?.length) {
      setExpanded(Object.fromEntries(sections.map((s) => [s.sectionId, true])));
    }
  }, [sections]);

  const toggle = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px' }}>
      {isLoading && (
        <div style={{ color: '#a0aec0', padding: 40, textAlign: 'center' }}>Loading…</div>
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

      {sections && (
        <>
          <h1 style={{ margin: '0 0 32px', fontSize: 26, color: '#1a202c' }}>
            📖 {book?.title ?? 'Book'}
          </h1>

          {sections.length === 0 && (
            <div style={{ color: '#a0aec0', padding: '40px 0', textAlign: 'center' }}>
              No sections found for this book.
            </div>
          )}

          {sections.map((section, idx) => (
            <div key={section.sectionId} style={{ marginBottom: 12 }}>
              {/* Section header / toggle */}
              <button
                onClick={() => toggle(section.sectionId)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: '#f7fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: expanded[section.sectionId] ? '8px 8px 0 0' : 8,
                  padding: '14px 18px',
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#2d3748',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>
                  <span style={{ color: '#a0aec0', fontSize: 12, fontWeight: 400, marginRight: 10 }}>
                    {idx + 1}.
                  </span>
                  {section.sectionName}
                </span>
                <span style={{ color: '#a0aec0', fontSize: 13 }}>
                  {expanded[section.sectionId] ? '▲' : '▼'}
                </span>
              </button>

              {/* Paragraphs */}
              {expanded[section.sectionId] && (
                <div
                  style={{
                    border: '1px solid #e2e8f0',
                    borderTop: 'none',
                    borderRadius: '0 0 8px 8px',
                    padding: '4px 24px 8px',
                    background: '#fff',
                  }}
                >
                  {section.content.map((para, pIdx) => (
                    <p
                      key={pIdx}
                      style={{
                        margin: '14px 0',
                        color: '#4a5568',
                        lineHeight: 1.8,
                        fontSize: 15,
                      }}
                    >
                      {para.text}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
