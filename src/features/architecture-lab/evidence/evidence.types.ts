import type { HighlightedCode } from '../code/code-types';
export interface AnalysisResult {
  id: string;
  exitCode: number;
  moduleCount: number;
  verification?: {
    typecheck: boolean;
    saveRecoverClear: boolean;
    useCaseSource?: string;
    isolatedCopies: string[];
  };
  violations: { from: string; to: string; rule: string; cyclePath?: string[] }[];
}
export interface WalkthroughExcerpt {
  id: string;
  path: string;
  start: number;
  end: number;
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
  source: string;
  code?: HighlightedCode;
}
export interface Evidence {
  generatedAt: string;
  walkthrough?: WalkthroughExcerpt[];
  results: AnalysisResult[];
  snippets: Record<string, string>;
  highlightedSnippets?: Record<string, HighlightedCode>;
  highlightedReports?: Record<string, HighlightedCode>;
}
