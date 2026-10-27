import { Fragment } from 'react';
import type { HighlightedCode } from './code-types';

interface Props {
  source: string;
  code?: HighlightedCode;
  label: string;
}

export function CodeBlock({ source, code, label }: Props) {
  const lines = code?.source === source ? code.lines : undefined;
  return (
    <pre className="code-block" tabIndex={0} role="region" aria-label={label}>
      <code>
        {lines
          ? lines.map(({ tokens, ending }, lineIndex) => (
              <Fragment key={lineIndex}>
                {tokens.map(({ content, color }, tokenIndex) => (
                  <span key={tokenIndex} style={{ color }}>
                    {content}
                  </span>
                ))}
                {ending}
              </Fragment>
            ))
          : source}
      </code>
    </pre>
  );
}
