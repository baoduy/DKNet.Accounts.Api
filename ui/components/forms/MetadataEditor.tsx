import type { CSSProperties, JSX } from 'react';

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

export function MetadataEditor(_props: MetadataEditorProps): JSX.Element {
  throw new Error('Not implemented: MetadataEditor');
}
