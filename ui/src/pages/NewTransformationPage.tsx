import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchBooks, fetchBookSections } from '../api/books';
import { fetchVoices } from '../api/voices';
import {
  fetchTransformation,
  createTransformation,
  saveVoiceMapping,
  triggerGeneration,
} from '../api/transformations';
import { PersonaSelector } from '../components/PersonaSelector';
import { StatusBadge } from '../components/StatusBadge';
import { useAppStore } from '../store/useAppStore';
import { useRole } from '../features/auth/useRole';

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
  const [saving, setSaving] = useState(false);

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

  const handleSave = async () => {
    if (!transformationId) return;
    setSaving(true);
    try {
      await saveVoiceMapping(transformationId, voiceMapping);
      queryClient.invalidateQueries({ queryKey: ['transformation', transformationId] });
    } finally {
      setSaving(false);
    }
  };

  const generateMutation = useMutation({
    mutationFn: async () => {
      await saveVoiceMapping(transformationId!, voiceMapping);
      await triggerGeneration(transformationId!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transformation', transformationId] });
    },
  });

  if (role === 'GUEST') return null;

  const status = transformation?.status;
  const isGenerating = status === 'GENERATING';
  const isFailed = status === 'FAILED';

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
              <option value="">— choose a book —</option>
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
      {transformationId && !isGenerating && !isFailed && (
        <div>
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
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '10px 20px',
                  background: '#edf2f7',
                  color: '#4a5568',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {saving ? 'Saving…' : 'Save Draft'}
              </button>
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
          )}

          {!allAssigned && uniqueAuthors.length > 0 && (
            <p style={{ color: '#a0aec0', fontSize: 12, marginTop: 8 }}>
              Assign a voice to every author to enable generation.
            </p>
          )}
        </div>
      )}

      {isGenerating && (
        <div style={{ textAlign: 'center', padding: 60, color: '#4a5568' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <h3 style={{ margin: '0 0 8px' }}>Generating Audio…</h3>
          <p style={{ margin: 0, color: '#a0aec0', fontSize: 14 }}>Checking every 3 seconds.</p>
        </div>
      )}

      {isFailed && (
        <div
          style={{
            background: '#fff5f5',
            color: '#c53030',
            padding: 16,
            borderRadius: 8,
            marginTop: 16,
          }}
        >
          Generation failed. Please try again or create a new transformation.
        </div>
      )}
    </div>
  );
}
