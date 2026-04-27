import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchBooks, fetchBookSections } from '../api/books';
import { fetchVoices } from '../api/voices';
import {
  fetchTransformation,
  createTransformation,
  saveVoiceMapping,
  triggerGeneration,
  deleteTransformation,
} from '../api/transformations';
import { PersonaSelector } from '../components/PersonaSelector';
import { StatusBadge } from '../components/StatusBadge';
import { useAppStore } from '../store/useAppStore';
import { useRole } from '../features/auth/useRole';

const GENERATING_TEXTS = [
  "We're bringing your content to life, please wait…",
  "Crafting each voice with care, just a moment…",
  "Weaving words into sound, this won't take long…",
  "Your story is finding its voice…",
  "Breathing life into every paragraph…",
  "The narrators are warming up…",
  "Transforming text into an immersive experience…",
  "Almost there — your audiobook is taking shape…",
  "Each sentence is being lovingly rendered…",
  "Good things take a moment — your audio is on its way…",
];

export function NewTransformationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const role = useRole();
  const setActiveTransformation = useAppStore((s) => s.setActiveTransformation);
  const [searchParams] = useSearchParams();
  const resumeId = searchParams.get('resumeId');

  // Redirect guests immediately
  useEffect(() => {
    if (role === 'GUEST') navigate('/login', { replace: true });
  }, [role]);

  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const [transformationId, setTransformationId] = useState<string | null>(resumeId);
  const [voiceMapping, setVoiceMapping] = useState<Record<string, string>>({});
  const [genTextIndex, setGenTextIndex] = useState(0);
  const genTextTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (resumeId) setActiveTransformation(resumeId);
  }, [resumeId]);

  const { data: booksData } = useQuery({
    queryKey: ['books', { size: 100 }],
    queryFn: () => fetchBooks({ size: 100 }),
    enabled: role !== 'GUEST',
  });
  const books = booksData?.items ?? [];

  const {
    data: voices = [],
    isLoading: voicesLoading,
    isError: voicesError,
  } = useQuery({
    queryKey: ['voices'],
    queryFn: fetchVoices,
    enabled: role !== 'GUEST',
  });

  const { data: sectionsData } = useQuery({
    queryKey: ['sections', selectedBookId],
    queryFn: () => fetchBookSections(selectedBookId, { size: 200 }),
    enabled: !!selectedBookId,
  });
  const sections = sectionsData?.items ?? [];

  const { data: transformation } = useQuery({
    queryKey: ['transformation', transformationId],
    queryFn: () => fetchTransformation(transformationId!),
    enabled: !!transformationId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'GENERATING' ? 3000 : false;
    },
  });

  // Pre-fill when resuming
  useEffect(() => {
    if (transformation && resumeId && !selectedBookId) {
      setSelectedBookId(transformation.bookId);
      setVoiceMapping(transformation.voiceMapping ?? {});
    }
  }, [transformation, resumeId]);

  // Navigate to player once done
  useEffect(() => {
    if (transformation?.status === 'DONE') {
      setActiveTransformation(transformation.id);
      navigate('/player');
    }
  }, [transformation?.status]);

  const uniqueAuthors = [
    ...new Set(sections.flatMap((s) => s.content.map((p) => p.author)).filter(Boolean)),
  ];

  const allAssigned = uniqueAuthors.length > 0 && uniqueAuthors.every((a) => !!voiceMapping[a]);

  const selectedBook = books.find((b) => b.id === selectedBookId);

  const createMutation = useMutation({
    mutationFn: () =>
      createTransformation(selectedBookId, selectedBook?.title ?? selectedBookId),
    onSuccess: (t) => {
      setTransformationId(t.id);
      setActiveTransformation(t.id);
      setVoiceMapping(t.voiceMapping ?? {});
      queryClient.invalidateQueries({ queryKey: ['transformations'] });
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      await saveVoiceMapping(transformationId!, voiceMapping);
      await triggerGeneration(transformationId!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transformation', transformationId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTransformation(transformationId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transformations'] });
      navigate('/transformations');
    },
  });

  const status = transformation?.status;
  const isGenerating = status === 'GENERATING';
  const isFailed = status === 'FAILED';
  const showGenerating = generateMutation.isPending || isGenerating;

  useEffect(() => {
    if (!showGenerating) {
      setGenTextIndex(0);
      return;
    }
    const currentText = GENERATING_TEXTS[genTextIndex];
    const duration = Math.max(2500, currentText.length * 65);
    genTextTimer.current = setTimeout(
      () => setGenTextIndex((i) => (i + 1) % GENERATING_TEXTS.length),
      duration,
    );
    return () => {
      if (genTextTimer.current) clearTimeout(genTextTimer.current);
    };
  }, [genTextIndex, showGenerating]);

  if (role === 'GUEST') return null;

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 26, color: '#1a202c' }}>
          {resumeId ? 'Continue Transformation' : 'New Transformation'}
        </h1>
        <p style={{ margin: 0, color: '#718096', fontSize: 14 }}>
          {resumeId
            ? 'Pick up where you left off.'
            : 'Select a book, assign voices to authors, then generate audio.'}
        </p>
      </div>

      {/* Step 1: Book picker */}
      {!transformationId && !resumeId && (
        <div
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: 24,
            marginBottom: 24,
          }}
        >
          <h3 style={{ margin: '0 0 16px', color: '#2d3748', fontSize: 15 }}>
            1 · Select a Book
          </h3>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <select
              value={selectedBookId}
              onChange={(e) => setSelectedBookId(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e0',
                fontSize: 14,
                color: '#2d3748',
              }}
            >
              <option value="" disabled>Pick a book to transform…</option>
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
            <button
              onClick={() => createMutation.mutate()}
              disabled={!selectedBookId || createMutation.isPending}
              style={{
                padding: '9px 20px',
                background: selectedBookId
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : '#e2e8f0',
                color: selectedBookId ? '#fff' : '#a0aec0',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: selectedBookId ? 'pointer' : 'not-allowed',
                whiteSpace: 'nowrap',
              }}
            >
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </button>
          </div>
          {createMutation.isError && (
            <p style={{ margin: '10px 0 0', color: '#c53030', fontSize: 13 }}>
              Failed to create transformation.
            </p>
          )}
        </div>
      )}

      {/* Transformation header */}
      {transformationId && transformation && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 24,
            padding: '12px 16px',
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            flexWrap: 'wrap',
          }}
        >
          {transformation.name && (
            <span style={{ color: '#2d3748', fontSize: 14, fontWeight: 600 }}>
              {transformation.name}
            </span>
          )}
          <span style={{ color: '#4a5568', fontSize: 13 }}>
            {books.find((b) => b.id === selectedBookId)?.title ?? selectedBookId}
          </span>
          <span style={{ color: '#cbd5e0' }}>·</span>
          <span style={{ color: '#718096', fontSize: 12, fontFamily: 'monospace' }}>
            {transformationId.slice(-8)}
          </span>
          <StatusBadge status={transformation.status} />
        </div>
      )}

      {/* Step 2: Voice assignment */}
      {transformationId && !isFailed && (
        <div style={{ opacity: showGenerating ? 0.45 : 1, pointerEvents: showGenerating ? 'none' : 'auto', transition: 'opacity 0.3s' }}>
          <h3 style={{ margin: '0 0 16px', color: '#2d3748', fontSize: 15 }}>
            2 · Assign Voices to Authors
          </h3>

          {voicesError && (
            <div
              style={{
                background: '#fff5f5',
                color: '#c53030',
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: 13,
                marginBottom: 12,
              }}
            >
              Failed to load voices from /api/v1/voices.
            </div>
          )}

          {voicesLoading || (uniqueAuthors.length === 0 && sections.length === 0) ? (
            <p style={{ color: '#a0aec0', fontSize: 14 }}>
              {voicesLoading ? 'Loading voices…' : 'Loading sections…'}
            </p>
          ) : null}

          {!voicesLoading &&
            uniqueAuthors.map((author) => (
              <div
                key={author}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  marginBottom: 8,
                  background: '#fff',
                }}
              >
                <div style={{ fontWeight: 500, color: '#2d3748', fontSize: 14 }}>{author}</div>
                <PersonaSelector
                  itemKey={author}
                  voices={voices}
                  value={voiceMapping[author] ?? ''}
                  onChange={(key, vid) => setVoiceMapping((m) => ({ ...m, [key]: vid }))}
                />
              </div>
            ))}

          {uniqueAuthors.length > 0 && !voicesLoading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, gap: 12, flexWrap: 'wrap' }}>
              {/* Left: draft label + generate */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 12, color: '#a0aec0', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 14 }}>✓</span> Saved as draft
                </span>
                <button
                  onClick={() => generateMutation.mutate()}
                  disabled={!allAssigned || generateMutation.isPending}
                  style={{
                    padding: '10px 24px',
                    background: allAssigned
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      : '#e2e8f0',
                    color: allAssigned ? '#fff' : '#a0aec0',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: allAssigned ? 'pointer' : 'not-allowed',
                  }}
                >
                  {generateMutation.isPending ? 'Starting…' : 'Generate Audio'}
                </button>
              </div>

              {/* Right: delete */}
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                style={{
                  padding: '10px 18px',
                  background: 'transparent',
                  color: '#e53e3e',
                  border: '1px solid #feb2b2',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          )}

          {!allAssigned && uniqueAuthors.length > 0 && (
            <p style={{ color: '#a0aec0', fontSize: 12, marginTop: 8 }}>
              Assign a voice to every author to enable generation.
            </p>
          )}
        </div>
      )}

      {/* Step 3: Generating */}
      {showGenerating && (
        <div
          style={{
            marginTop: 32,
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: '32px 28px',
          }}
        >
          <h3 style={{ margin: '0 0 28px', color: '#2d3748', fontSize: 15 }}>
            3 · Generating Audio
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
            {/* Three bouncing dots */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {[0, 0.18, 0.36].map((delay, i) => (
                <div
                  key={i}
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    animation: 'dot-bounce 1.1s ease-in-out infinite',
                    animationDelay: `${delay}s`,
                  }}
                />
              ))}
            </div>

            {/* Rotating text */}
            <p
              key={genTextIndex}
              style={{
                margin: 0,
                fontSize: 14,
                color: '#4a5568',
                textAlign: 'center',
                maxWidth: 380,
                animation: 'text-fade-in 0.45s ease both',
              }}
            >
              {GENERATING_TEXTS[genTextIndex]}
            </p>
          </div>
        </div>
      )}

      {isFailed && !generateMutation.isPending && (
        <div
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: '32px 28px',
            marginTop: 32,
          }}
        >
          <h3 style={{ margin: '0 0 12px', color: '#2d3748', fontSize: 15 }}>
            3 · Generating Audio
          </h3>
          <p style={{ margin: '0 0 24px', fontSize: 13, color: '#c53030' }}>
            Generation failed. You can try again or delete this transformation.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              style={{
                padding: '10px 24px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {generateMutation.isPending ? 'Starting…' : 'Try Again'}
            </button>
            <button
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              style={{
                padding: '10px 18px',
                background: 'transparent',
                color: '#e53e3e',
                border: '1px solid #feb2b2',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
