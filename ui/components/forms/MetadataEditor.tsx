import { useState, type CSSProperties, type JSX } from 'react';
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

let nextRowId = 0;

function newRowIds(count: number): number[] {
  return Array.from({ length: count }, () => nextRowId++);
}

export function MetadataEditor({ entries, onChange, readOnly = false, style }: MetadataEditorProps): JSX.Element {
  // DRK-1760 §3 row 12 — each row keeps its own id for as long as it is on screen, so removing
  // one never redraws the rows after it into other inputs (and moves the cursor with them).
  const [rowIds, setRowIds] = useState(() => newRowIds(entries.length));
  if (rowIds.length !== entries.length) {
    // Rows the owner added or dropped on its own (another record's metadata) are matched up here.
    setRowIds(rowIds.length < entries.length ? [...rowIds, ...newRowIds(entries.length - rowIds.length)] : rowIds.slice(0, entries.length));
  }

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
    setRowIds(rowIds.filter((_, i) => i !== index));
    onChange?.(entries.filter((_, i) => i !== index));
  }

  function addEntry(): void {
    onChange?.([...entries, { key: '', value: '' }]);
  }

  return (
    <div className="flex flex-col gap-2" style={style}>
      {entries.map((entry, index) => (
        <div key={rowIds[index]} className="flex items-center gap-2">
          <Input
            className="font-mono"
            aria-label={`Key, row ${index + 1}`}
            value={entry.key}
            placeholder="key"
            onChange={(event) => updateEntry(index, { key: event.target.value })}
          />
          <Input
            className="font-mono"
            aria-label={`Value, row ${index + 1}`}
            value={entry.value}
            placeholder="value"
            onChange={(event) => updateEntry(index, { value: event.target.value })}
          />
          <Button variant="ghost" size="sm" aria-label={`Remove row ${index + 1}`} onClick={() => removeEntry(index)}>
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
