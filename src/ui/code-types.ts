export interface CodeToken {
  readonly content: string;
  readonly color: string;
}

export interface HighlightedCode {
  readonly source: string;
  readonly language: 'typescript' | 'javascript' | 'json';
  readonly lines: readonly {
    readonly tokens: readonly CodeToken[];
    readonly ending: string;
  }[];
}
