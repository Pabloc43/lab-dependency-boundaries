import { Fragment } from 'react';
import styles from './CodeBlock.module.css';
import type { HighlightedCode } from './code-types';

interface Props {
  source: string;
  code?: HighlightedCode;
  label: string;
  className?: string;
}

export function CodeBlock({ source, code, label, className }: Props) {
  const lines = code && code.source === source ? code.lines : undefined;
  return (
    <pre
      className={[styles['code-block'], className].filter(Boolean).join(' ')}
      tabIndex={0}
      role="region"
      aria-label={label}
    >
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
