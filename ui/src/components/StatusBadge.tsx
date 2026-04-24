import type { TransformationStatus } from '../types';

const colors: Record<TransformationStatus, { bg: string; text: string }> = {
  DRAFT: { bg: '#edf2f7', text: '#4a5568' },
  VOICE_ASSIGNMENT: { bg: '#ebf8ff', text: '#2b6cb0' },
  GENERATING: { bg: '#fefcbf', text: '#975a16' },
  DONE: { bg: '#f0fff4', text: '#276749' },
  FAILED: { bg: '#fff5f5', text: '#c53030' },
};

interface Props {
  status: TransformationStatus;
}

export function StatusBadge({ status }: Props) {
  const c = colors[status] ?? colors.DRAFT;
  return (
    <span
      style={{
        background: c.bg,
        color: c.text,
        padding: '2px 10px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}
    >
      {status.replace('_', ' ')}
    </span>
  );
}
