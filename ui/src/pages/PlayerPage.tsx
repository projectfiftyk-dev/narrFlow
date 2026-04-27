import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchContent } from '../api/content';
import { fetchTransformation } from '../api/transformations';
import { PlayerControls } from '../components/PlayerControls';
import { StatusBadge } from '../components/StatusBadge';
import { useAppStore } from '../store/useAppStore';

function localAudioUrl(audioUri: string): string {
  try {
    return new URL(audioUri).pathname;
  } catch {
    return audioUri;
  }
}

export function PlayerPage() {
  const navigate = useNavigate();
  const activeId = useAppStore((s) => s.activeTransformationId);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Reset position when active transformation changes
  useEffect(() => {
    setCurrentIndex(0);
    setIsPlaying(false);
    setAudioError(null);
    audioRef.current?.pause();
  }, [activeId]);

  const { data: transformation, isLoading: loadingTransform } = useQuery({
    queryKey: ['transformation', activeId],
    queryFn: () => fetchTransformation(activeId!),
    enabled: !!activeId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'GENERATING' ? 3000 : false;
    },
  });

  const { data: content, isLoading: loadingContent } = useQuery({
    queryKey: ['content', activeId],
    queryFn: () => fetchContent(activeId!),
    enabled: transformation?.status === 'DONE',
  });

  const items = content?.items ?? [];
  const current = items[currentIndex];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current?.audioUri) return;
    setAudioError(null);
    audio.src = localAudioUrl(current.audioUri);
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

  // No active transformation
  if (!activeId) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>▶</div>
        <h2 style={{ margin: '0 0 12px', color: '#2d3748' }}>No transformation selected</h2>
        <p style={{ color: '#718096', fontSize: 14, marginBottom: 24 }}>
          Go to Transformations and select one to play, or create a new one.
        </p>
        <button
          onClick={() => navigate('/transformations')}
          style={{
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            marginRight: 8,
          }}
        >
          View Transformations
        </button>
      </div>
    );
  }

  if (loadingTransform) {
    return (
      <div style={{ textAlign: 'center', color: '#a0aec0', padding: 60 }}>Loading…</div>
    );
  }

  // Non-DONE states
  if (transformation && transformation.status !== 'DONE') {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
        <div style={{ marginBottom: 16 }}>
          <StatusBadge status={transformation.status} />
        </div>
        {transformation.status === 'GENERATING' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <h2 style={{ margin: '0 0 8px', color: '#2d3748' }}>Generating Audio…</h2>
            <p style={{ color: '#a0aec0', fontSize: 14 }}>This page will update automatically.</p>
          </>
        )}
        {transformation.status === 'FAILED' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✗</div>
            <h2 style={{ margin: '0 0 8px', color: '#c53030' }}>Generation Failed</h2>
            <p style={{ color: '#718096', fontSize: 14 }}>Please create a new transformation.</p>
          </>
        )}
        {(transformation.status === 'DRAFT' || transformation.status === 'VOICE_ASSIGNMENT') && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✏️</div>
            <h2 style={{ margin: '0 0 8px', color: '#2d3748' }}>Not ready yet</h2>
            <p style={{ color: '#718096', fontSize: 14, marginBottom: 24 }}>
              Continue this transformation or start fresh with a new one.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate(`/new-transformation?resumeId=${activeId}`)}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Continue
              </button>
              <button
                onClick={() => navigate('/new-transformation')}
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  color: '#667eea',
                  border: '1px solid #667eea',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                New Transformation
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // DONE — show player
  if (loadingContent) {
    return (
      <div style={{ textAlign: 'center', color: '#a0aec0', padding: 60 }}>Loading content…</div>
    );
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px' }}>
      {content && current && (
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            padding: 40,
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          }}
        >
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 20, color: '#1a202c' }}>Book Player</h2>
            <div style={{ fontSize: 13, color: '#718096' }}>
              {current.sectionName && (
                <span>
                  <strong>{current.sectionName}</strong> ·{' '}
                </span>
              )}
              Author: <strong>{current.author}</strong>
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
            Segment {currentIndex + 1} of {items.length}
          </div>

          {audioError && (
            <div
              style={{
                marginTop: 16,
                background: '#fff5f5',
                color: '#c53030',
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: 13,
              }}
            >
              {audioError}
            </div>
          )}

          <audio ref={audioRef} style={{ display: 'none' }} />
        </div>
      )}

      {content && items.length === 0 && (
        <div style={{ textAlign: 'center', color: '#a0aec0', padding: 60 }}>
          No audio segments found.
        </div>
      )}
    </div>
  );
}
