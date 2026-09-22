import type { CSSProperties } from 'react';

export interface MetadataEntry { key: string; value: string }

/**
 * The editor for the API's `IReadOnlyDictionary<string,string>` metadata bag,
 * carried by accounts, groups and postings.
 */
export interface MetadataEditorProps {
  entries: MetadataEntry[];
  onChange?: (entries: MetadataEntry[]) => void;
  /** Collapses to the one-line `key=value · key=value` mono summary used on detail screens. */
  readOnly?: boolean;
  style?: CSSProperties;
}
export declare function MetadataEditor(props: MetadataEditorProps): JSX.Element;
