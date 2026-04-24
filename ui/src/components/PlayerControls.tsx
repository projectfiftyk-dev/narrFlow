interface Props {
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  canPrev: boolean;
  canNext: boolean;
}

const btnStyle = (disabled: boolean): React.CSSProperties => ({
  background: 'none',
  border: 'none',
  fontSize: 28,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.35 : 1,
  padding: '8px 12px',
  borderRadius: 8,
  transition: 'background 0.1s',
});

export function PlayerControls({ isPlaying, onPlay, onPause, onNext, onPrev, canPrev, canNext }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
      <button style={btnStyle(!canPrev)} disabled={!canPrev} onClick={onPrev} title="Previous">⏮</button>
      {isPlaying ? (
        <button style={{ ...btnStyle(false), fontSize: 36 }} onClick={onPause} title="Pause">⏸</button>
      ) : (
        <button style={{ ...btnStyle(false), fontSize: 36 }} onClick={onPlay} title="Play">▶️</button>
      )}
      <button style={btnStyle(!canNext)} disabled={!canNext} onClick={onNext} title="Next">⏭</button>
    </div>
  );
}
