import type { CSSProperties, ReactNode } from 'react';

interface TextProps { children?: ReactNode; style?: CSSProperties }

/** 11px / 600 / 0.05em, uppercase, muted — the label above a tile value or panel section. */
export declare function Label(props: TextProps): JSX.Element;
/** 12px muted inline text — timestamps, field captions, row sub-text. */
export declare function Caption(props: TextProps): JSX.Element;
/** 12px muted block text — the explanatory line under a card. */
export declare function Note(props: TextProps): JSX.Element;
/** JetBrains Mono — identifiers, codes, refusal codes, API field names in prose. */
export declare function Mono(props: TextProps): JSX.Element;
