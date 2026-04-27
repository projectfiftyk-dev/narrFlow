import { useState, useRef, useEffect } from 'react';
import type { Voice } from '../types';

const GRADIENT = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

interface Props {
  itemKey: string;
  voices: Voice[];
  value: string;
  onChange: (key: string, voiceId: string) => void;
}

export function PersonaSelector({ itemKey, voices, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [testLang, setTestLang] = useState<'en' | 'ro'>('en');
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [playing, setPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  const selectedVoice = voices.find((v) => v.id === value);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Stop audio when voice changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlaying(false);
    }
  }, [value]);

  const handleSelect = (id: string) => {
    onChange(itemKey, id);
    setOpen(false);
  };

  const handleTest = () => {
    if (!selectedVoice?.tests) return;
    const entry = selectedVoice.tests.find((t) => t.language === testLang);
    if (!entry) return;

    if (playing && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlaying(false);
      return;
    }

    const audio = new Audio(entry.url);
    audioRef.current = audio;
    audio.play();
    setPlaying(true);
    audio.onended = () => {
      setPlaying(false);
      audioRef.current = null;
    };
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

      {/* Persona dropdown */}
      <div ref={dropdownRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen((o) => !o)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            minWidth: 170,
            background: '#fff',
            border: '1px solid #cbd5e0',
            borderRadius: 6,
            fontSize: 13,
            color: selectedVoice ? '#2d3748' : '#a0aec0',
            cursor: 'pointer',
          }}
        >
          <span style={{ flex: 1, textAlign: 'left' }}>
            {selectedVoice ? selectedVoice.friendlyName : 'Choose a persona'}
          </span>
          <span style={{ color: '#a0aec0', fontSize: 10 }}>▼</span>
        </button>

        {open && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              right: 0,
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              zIndex: 200,
              minWidth: 230,
              overflow: 'hidden',
            }}
          >
            {voices.map((v) => (
              <div
                key={v.id}
                onMouseEnter={() => setHoveredId(v.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => handleSelect(v.id)}
                style={{
                  padding: '10px 14px',
                  cursor: 'pointer',
                  background: hoveredId === v.id ? '#f5f3ff' : v.id === value ? '#faf5ff' : 'transparent',
                  borderLeft: v.id === value ? '3px solid #7c3aed' : '3px solid transparent',
                  transition: 'background 0.1s',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: '#2d3748' }}>
                  {v.friendlyName}
                </div>
                {hoveredId === v.id && v.description && (
                  <div style={{ fontSize: 11, color: '#9f7aea', marginTop: 3 }}>
                    {v.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Test controls — only shown once a voice is selected */}
      {selectedVoice?.tests && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {/* Play/pause button */}
          <button
            onClick={handleTest}
            title={`Test ${selectedVoice.friendlyName} in ${testLang.toUpperCase()}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 11px',
              background: playing ? 'rgba(102,126,234,0.1)' : GRADIENT,
              color: playing ? '#667eea' : '#fff',
              border: playing ? '1px solid rgba(102,126,234,0.3)' : 'none',
              borderRadius: '6px 0 0 6px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {playing ? '⏸' : '▶'} {testLang.toUpperCase()}
          </button>

          {/* Language picker */}
          <div ref={langRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setLangMenuOpen((o) => !o)}
              title="Switch language"
              style={{
                padding: '6px 7px',
                background: '#f0ebff',
                border: '1px solid rgba(102,126,234,0.25)',
                borderLeft: 'none',
                borderRadius: '0 6px 6px 0',
                fontSize: 11,
                color: '#7c3aed',
                cursor: 'pointer',
                lineHeight: 1,
              }}
            >
              ▾
            </button>
            {langMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  right: 0,
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  zIndex: 200,
                  overflow: 'hidden',
                  minWidth: 130,
                }}
              >
                {(['en', 'ro'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => {
                      setTestLang(lang);
                      setLangMenuOpen(false);
                      if (audioRef.current) {
                        audioRef.current.pause();
                        audioRef.current = null;
                        setPlaying(false);
                      }
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '8px 14px',
                      background: testLang === lang ? '#f5f3ff' : 'transparent',
                      border: 'none',
                      fontSize: 12,
                      fontWeight: testLang === lang ? 600 : 400,
                      color: testLang === lang ? '#7c3aed' : '#4a5568',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    {lang === 'en' ? '🇬🇧 English' : '🇷🇴 Romanian'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
