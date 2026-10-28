import type { HighlightedCode } from '../code/code-types';
export interface AnalysisResult {
  id: string;
  exitCode: number;
  moduleCount: number;
  violations: { from: string; to: string; rule: string; cyclePath?: string[] }[];
}
export interface Evidence {
  generatedAt: string;
  results: AnalysisResult[];
  snippets: Record<string, string>;
  highlightedSnippets?: Record<string, HighlightedCode>;
  highlightedReports?: Record<string, HighlightedCode>;
}
