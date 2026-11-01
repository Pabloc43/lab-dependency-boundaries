import type { Evidence } from '../evidence.types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isSafeInteger(value: unknown, minimum = 0): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum;
}

function isCodeToken(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.content === 'string' &&
    typeof value.color === 'string'
  );
}

function isCodeLine(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.ending === 'string' &&
    Array.isArray(value.tokens) &&
    value.tokens.every(isCodeToken)
  );
}

function isHighlightedCode(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.source === 'string' &&
    typeof value.language === 'string' &&
    ['typescript', 'tsx', 'javascript', 'json'].includes(value.language) &&
    Array.isArray(value.lines) &&
    value.lines.every(isCodeLine)
  );
}

function isOptionalCodeMap(value: unknown): boolean {
  return (
    value === undefined ||
    (isRecord(value) && Object.values(value).every(isHighlightedCode))
  );
}

function isVerification(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.typecheck === 'boolean' &&
    typeof value.saveRecoverClear === 'boolean' &&
    isStringArray(value.isolatedCopies) &&
    (value.useCaseSource === undefined || typeof value.useCaseSource === 'string')
  );
}

function isViolation(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.from === 'string' &&
    typeof value.to === 'string' &&
    typeof value.rule === 'string' &&
    (value.cyclePath === undefined || isStringArray(value.cyclePath))
  );
}

function isAnalysisResult(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    isSafeInteger(value.exitCode) &&
    isSafeInteger(value.moduleCount) &&
    Array.isArray(value.violations) &&
    value.violations.every(isViolation) &&
    (value.verification === undefined || isVerification(value.verification))
  );
}

function isWalkthroughExcerpt(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.path === 'string' &&
    typeof value.source === 'string' &&
    isSafeInteger(value.start) &&
    isSafeInteger(value.end) &&
    isSafeInteger(value.startLine, 1) &&
    isSafeInteger(value.endLine, 1) &&
    isSafeInteger(value.startColumn, 1) &&
    isSafeInteger(value.endColumn, 1) &&
    (value.code === undefined || isHighlightedCode(value.code))
  );
}

// Validate consumed data, not a build version: historical omissions and empty snippets are valid.
export function isEvidence(value: unknown): value is Evidence {
  if (
    !isRecord(value) ||
    typeof value.generatedAt !== 'string' ||
    !Number.isFinite(Date.parse(value.generatedAt))
  ) {
    return false;
  }

  return (
    Array.isArray(value.results) &&
    value.results.every(isAnalysisResult) &&
    isRecord(value.snippets) &&
    Object.values(value.snippets).every((source) => typeof source === 'string') &&
    isOptionalCodeMap(value.highlightedSnippets) &&
    isOptionalCodeMap(value.highlightedReports) &&
    (value.walkthrough === undefined ||
      (Array.isArray(value.walkthrough) && value.walkthrough.every(isWalkthroughExcerpt)))
  );
}
