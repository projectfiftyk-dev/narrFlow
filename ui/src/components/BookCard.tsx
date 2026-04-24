import type { Book } from '../types';

interface Props {
  book: Book;
  onClick: (id: string) => void;
}

export function BookCard({ book, onClick }: Props) {
  return (
    <div
      onClick={() => onClick(book.id)}
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: 24,
        cursor: 'pointer',
        background: '#fff',
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)')}
      onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.boxShadow = 'none')}
    >
      <div style={{ fontSize: 32, marginBottom: 8 }}>📖</div>
      <h3 style={{ margin: '0 0 8px', fontSize: 18, color: '#1a202c' }}>{book.title}</h3>
      {book.author && <p style={{ margin: '0 0 8px', color: '#718096', fontSize: 14 }}>{book.author}</p>}
      {book.description && <p style={{ margin: 0, color: '#4a5568', fontSize: 13 }}>{book.description}</p>}
    </div>
  );
}
