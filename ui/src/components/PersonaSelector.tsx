import type { Voice } from '../types';

interface Props {
  sectionId: string;
  voices: Voice[];
  value: string;
  onChange: (sectionId: string, voiceId: string) => void;
}

export function PersonaSelector({ sectionId, voices, value, onChange }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(sectionId, e.target.value)}
      style={{
        padding: '4px 8px',
        borderRadius: 6,
        border: '1px solid #cbd5e0',
        fontSize: 13,
        color: '#2d3748',
        cursor: 'pointer',
      }}
    >
      <option value="">— select voice —</option>
      {voices.map((v) => (
        <option key={v.id} value={v.id}>
          {v.friendlyName}
        </option>
      ))}
    </select>
  );
}
