import type { CSSProperties, JSX } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export interface MetadataEntry {
  key: string;
  value: string;
}

export interface MetadataEditorProps {
  entries: MetadataEntry[];
  onChange?: (entries: MetadataEntry[]) => void;
  /** Collapses to the one-line `key=value · key=value` mono summary used on detail screens. */
  readOnly?: boolean;
  style?: CSSProperties;
}

export function MetadataEditor({ entries, onChange, readOnly = false, style }: MetadataEditorProps): JSX.Element {
  if (readOnly) {
    return (
      <p className="font-mono text-[length:var(--text-caption-size)]" style={style}>
        {entries.map((entry) => `${entry.key}=${entry.value}`).join(' · ')}
      </p>
    );
  }

  function updateEntry(index: number, patch: Partial<MetadataEntry>): void {
    onChange?.(entries.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  }

  function removeEntry(index: number): void {
    onChange?.(entries.filter((_, i) => i !== index));
  }

  function addEntry(): void {
    onChange?.([...entries, { key: '', value: '' }]);
  }

  return (
    <div className="flex flex-col gap-2" style={style}>
      {entries.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            className="font-mono"
            value={entry.key}
            placeholder="key"
            onChange={(event) => updateEntry(index, { key: event.target.value })}
          />
          <Input
            className="font-mono"
            value={entry.value}
            placeholder="value"
            onChange={(event) => updateEntry(index, { value: event.target.value })}
          />
          <Button variant="ghost" size="sm" onClick={() => removeEntry(index)}>
            Remove
          </Button>
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={addEntry}>
        Add entry
      </Button>
    </div>
  );
}
