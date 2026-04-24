import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchBooks, fetchBookSections } from '../api/books';
import { fetchVoices } from '../api/voices';
import {
  fetchTransformation,
  fetchTransformationsForBook,
  createTransformation,
  savePersonaMapping,
  triggerGeneration,
} from '../api/transformations';
import { createPersona } from '../api/personas';
import { PersonaSelector } from '../components/PersonaSelector';
import { StatusBadge } from '../components/StatusBadge';
import type { PersonaMapping, Transformation } from '../types';

type GenerateStep = 'idle' | 'creating-personas' | 'saving-mapping' | 'triggering';

const MAX_TRANSFORMATIONS = 5;

export function TransformationBuilderPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTransformId, setActiveTransformId] = useState<string | null>(null);
  const [mapping, setMapping] = useState<PersonaMapping>({}); // { sectionId → voiceId }
  const [generateStep, setGenerateStep] = useState<GenerateStep>('idle');

  // Book title from cached library list
  const { data: books } = useQuery({ queryKey: ['books'], queryFn: fetchBooks });
  const bookMeta = books?.find((b) => b.id === bookId);

  // Flat sections array — BookSection[]
  const { data: sections = [] } = useQuery({
    queryKey: ['sections', bookId],
    queryFn: () => fetchBookSections(bookId!),
    enabled: !!bookId,
  });

  const { data: voices = [] } = useQuery({
    queryKey: ['voices'],
    queryFn: fetchVoices,
  });

  const { data: transformations = [] } = useQuery({
    queryKey: ['transformations', bookId],
    queryFn: () => fetchTransformationsForBook(bookId!),
    enabled: !!bookId,
  });

  // Poll active transformation when generating
  const { data: activeTransform } = useQuery({
    queryKey: ['transformation', activeTransformId],
    queryFn: () => fetchTransformation(activeTransformId!),
    enabled: !!activeTransformId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'DONE' || status === 'FAILED' ? false : 3000;
    },
  });

  useEffect(() => {
    if (activeTransform?.status === 'DONE') {
      navigate(`/content/${activeTransform.id}`);
    }
  }, [activeTransform, navigate]);

  const createMutation = useMutation({
    mutationFn: () => createTransformation(bookId!),
    onSuccess: (t: Transformation) => {
      queryClient.invalidateQueries({ queryKey: ['transformations', bookId] });
      setActiveTransformId(t.id);
      setMapping(t.personaMapping ?? {});
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => savePersonaMapping(activeTransformId!, mapping),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transformations', bookId] }),
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      // Step 1 — Create one persona per unique voice selected
      setGenerateStep('creating-personas');
      const uniqueVoiceIds = [...new Set(Object.values(mapping))];
      const createdPersonas = await Promise.all(
        uniqueVoiceIds.map((voiceId) => {
          const voice = voices.find((v) => v.id === voiceId);
          return createPersona({
            bookId: bookId!,
            name: voice?.friendlyName ?? voiceId,
            voiceId,
          });
        })
      );

      // Step 2 — Build voiceId → personaId lookup, then resolve sectionId → personaId
      const voiceToPersona: Record<string, string> = {};
      uniqueVoiceIds.forEach((voiceId, i) => {
        voiceToPersona[voiceId] = createdPersonas[i].id;
      });
      const resolvedMapping: PersonaMapping = {};
      for (const [sectionId, voiceId] of Object.entries(mapping)) {
        resolvedMapping[sectionId] = voiceToPersona[voiceId];
      }

      // Step 3 — Save persona mapping to the transformation
      setGenerateStep('saving-mapping');
      await savePersonaMapping(activeTransformId!, resolvedMapping);

      // Step 4 — Trigger generation
      setGenerateStep('triggering');
      return triggerGeneration(activeTransformId!);
    },
    onSuccess: (t: Transformation) => {
      setGenerateStep('idle');
      queryClient.invalidateQueries({ queryKey: ['transformation', activeTransformId] });
      setActiveTransformId(t.id);
    },
    onError: () => setGenerateStep('idle'),
  });

  // Use sectionId as the mapping key (matches real API shape)
  const allAssigned =
    sections.length > 0 && sections.every((s) => !!mapping[s.sectionId]);
  const atLimit = transformations.length >= MAX_TRANSFORMATIONS;
  const isGenerating = activeTransform?.status === 'GENERATING';

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '40px 24px' }}>
      <button
        onClick={() => navigate(`/books/${bookId}`)}
        style={{
          background: 'none',
          border: 'none',
          color: '#667eea',
          cursor: 'pointer',
          fontSize: 14,
          marginBottom: 24,
          padding: 0,
        }}
      >
        ← Back to Book
      </button>

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 26, color: '#1a202c' }}>
          🎭 Transformation Builder
        </h1>
        {bookMeta && (
          <p style={{ margin: 0, color: '#718096' }}>
            Book: <strong>{bookMeta.title}</strong>
          </p>
        )}
      </div>

      {/* Existing transformations */}
      {transformations.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ margin: '0 0 12px', color: '#2d3748', fontSize: 16 }}>
            Your Transformations ({transformations.length}/{MAX_TRANSFORMATIONS})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {transformations.map((t) => (
              <div
                key={t.id}
                onClick={() => {
                  setActiveTransformId(t.id);
                  setMapping(t.personaMapping ?? {});
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  border: `2px solid ${activeTransformId === t.id ? '#667eea' : '#e2e8f0'}`,
                  borderRadius: 8,
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                <span style={{ color: '#4a5568', fontSize: 14 }}>
                  Transformation {t.id.slice(-6)}
                </span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <StatusBadge status={t.status} />
                  {t.status === 'DONE' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/content/${t.id}`);
                      }}
                      style={{
                        background: '#667eea',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        padding: '4px 12px',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      ▶ Play
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create new button */}
      {!activeTransformId && (
        <button
          onClick={() => createMutation.mutate()}
          disabled={atLimit || createMutation.isPending}
          style={{
            padding: '12px 24px',
            background: atLimit
              ? '#e2e8f0'
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: atLimit ? '#a0aec0' : '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 600,
            cursor: atLimit ? 'not-allowed' : 'pointer',
            marginBottom: 24,
          }}
        >
          {atLimit
            ? `Limit reached (${MAX_TRANSFORMATIONS} max)`
            : '+ New Transformation'}
        </button>
      )}

      {/* Voice assignment — one row per BookSection */}
      {activeTransformId && !isGenerating && (
        <div>
          <h3 style={{ margin: '0 0 16px', color: '#2d3748' }}>
            Assign Voices to Sections
          </h3>

          {sections.length === 0 && (
            <p style={{ color: '#a0aec0' }}>No sections found for this book.</p>
          )}

          {sections.map((section, i) => {
            const preview = section.content
              .map((c) => c.text)
              .join(' ')
              .slice(0, 140);

            return (
              <div
                key={section.sectionId}
                style={{
                  padding: '14px 16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  marginBottom: 8,
                  background: '#fff',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 16,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 11,
                        color: '#a0aec0',
                        fontWeight: 600,
                        marginBottom: 2,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Section {i + 1}
                    </div>
                    <div
                      style={{
                        fontWeight: 600,
                        color: '#2d3748',
                        fontSize: 14,
                        marginBottom: 4,
                      }}
                    >
                      {section.sectionName}
                    </div>
                    <p style={{ margin: 0, color: '#718096', fontSize: 13, lineHeight: 1.5 }}>
                      {preview.length < section.content.map((c) => c.text).join(' ').length
                        ? preview + '…'
                        : preview}
                    </p>
                  </div>
                  <div style={{ flexShrink: 0, paddingTop: 4 }}>
                    <PersonaSelector
                      sectionId={section.sectionId}
                      voices={voices}
                      value={mapping[section.sectionId] ?? ''}
                      onChange={(sid, vid) =>
                        setMapping((m) => ({ ...m, [sid]: vid }))
                      }
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {sections.length > 0 && (
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
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
                {saveMutation.isPending ? 'Saving…' : 'Save Draft'}
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
                {generateStep === 'creating-personas' && 'Creating personas…'}
              {generateStep === 'saving-mapping' && 'Saving mapping…'}
              {generateStep === 'triggering' && 'Starting generation…'}
              {generateStep === 'idle' && '🔊 Generate Audio'}
              </button>
            </div>
          )}

          {!allAssigned && sections.length > 0 && (
            <p style={{ color: '#a0aec0', fontSize: 12, marginTop: 8 }}>
              Assign a voice to every section to enable generation.
            </p>
          )}
        </div>
      )}

      {/* Generating state */}
      {isGenerating && (
        <div style={{ textAlign: 'center', padding: 60, color: '#4a5568' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <h3 style={{ margin: '0 0 8px' }}>Generating Audio…</h3>
          <p style={{ margin: 0, color: '#a0aec0' }}>
            Checking status every 3 seconds.
          </p>
        </div>
      )}

      {activeTransform?.status === 'FAILED' && (
        <div
          style={{
            background: '#fff5f5',
            color: '#c53030',
            padding: 16,
            borderRadius: 8,
            marginTop: 16,
          }}
        >
          Generation failed. Please try again.
        </div>
      )}
    </div>
  );
}
