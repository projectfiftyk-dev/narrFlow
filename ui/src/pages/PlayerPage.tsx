import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchContent } from '../api/content';
import { PlayerControls } from '../components/PlayerControls';


export function PlayerPage() {
  const { contentId } = useParams<{ contentId: string }>();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const { data: content, isLoading, isError } = useQuery({
    queryKey: ['content', contentId],
    queryFn: () => fetchContent(contentId!),
    enabled: !!contentId,
  });

  const items = content?.items ?? [];
  const current = items[currentIndex];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current?.audioUri) return;
    setAudioError(null);
    audio.volume = 1;
    audio.src = current.audioUri;
    audio.load();
    if (isPlaying) {
      audio.play().catch((err) => {
        setIsPlaying(false);
        setAudioError(`Playback failed: ${err.message}`);
      });
    }
  }, [currentIndex, current?.audioUri]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => {
      if (currentIndex < items.length - 1) {
        setCurrentIndex((i) => i + 1);
      } else {
        setIsPlaying(false);
      }
    };
    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  }, [currentIndex, items.length]);

  const handlePlay = () => {
    setAudioError(null);
    audioRef.current?.play().catch((err) => {
      setIsPlaying(false);
      setAudioError(`Playback failed: ${err.message}`);
    });
    setIsPlaying(true);
  };

  const handlePause = () => {
    audioRef.current?.pause();
    setIsPlaying(false);
  };

  const handleNext = () => {
    audioRef.current?.pause();
    setCurrentIndex((i) => Math.min(i + 1, items.length - 1));
    if (isPlaying) setTimeout(() => audioRef.current?.play().catch(() => {}), 50);
  };

  const handlePrev = () => {
    audioRef.current?.pause();
    setCurrentIndex((i) => Math.max(i - 1, 0));
    if (isPlaying) setTimeout(() => audioRef.current?.play().catch(() => {}), 50);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #1a202c 0%, #2d3748 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{ width: '100%', maxWidth: 680 }}>
        <button
          onClick={() => navigate('/books')}
          style={{ background: 'none', border: 'none', color: '#a0aec0', cursor: 'pointer', fontSize: 14, marginBottom: 24, padding: 0 }}
        >
          ← Library
        </button>

        {isLoading && (
          <div style={{ color: '#a0aec0', textAlign: 'center', padding: 60 }}>Loading player…</div>
        )}

        {isError && (
          <div style={{ background: '#fff5f5', color: '#c53030', padding: 16, borderRadius: 8 }}>
            Failed to load content.
          </div>
        )}

        {content && current && (
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              padding: 40,
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            }}
          >
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ margin: '0 0 4px', fontSize: 22, color: '#1a202c' }}>📖 Book Player</h2>
              <div style={{ fontSize: 13, color: '#718096' }}>
                🎭 Persona: <strong>{current.personaId}</strong>
              </div>
            </div>

            <div
              style={{
                background: '#f7fafc',
                borderRadius: 12,
                padding: '28px 32px',
                marginBottom: 32,
                minHeight: 140,
              }}
            >
              <p style={{ margin: 0, fontSize: 17, lineHeight: 1.8, color: '#2d3748' }}>
                {current.text}
              </p>
            </div>

            <PlayerControls
              isPlaying={isPlaying}
              onPlay={handlePlay}
              onPause={handlePause}
              onNext={handleNext}
              onPrev={handlePrev}
              canPrev={currentIndex > 0}
              canNext={currentIndex < items.length - 1}
            />

            <div style={{ textAlign: 'center', marginTop: 16, color: '#a0aec0', fontSize: 13 }}>
              Section {currentIndex + 1} of {items.length}
            </div>

            {audioError && (
              <div style={{ marginTop: 16, background: '#fff5f5', color: '#c53030', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>
                ⚠️ {audioError}
              </div>
            )}

            <audio ref={audioRef} style={{ display: 'none' }} />
          </div>
        )}
      </div>
    </div>
  );
}
