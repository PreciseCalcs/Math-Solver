import React, { useMemo } from 'react';
import katex from 'katex';

export const MathBlock = ({ tex, inline = false }) => {
  const html = useMemo(() => {
    try {
      return katex.renderToString(String(tex ?? ''), {
        displayMode: !inline,
        throwOnError: false,
        strict: false,
      });
    } catch {
      return String(tex ?? '');
    }
  }, [tex, inline]);
  return (
    <span
      className={inline ? 'as-math-inline' : 'as-math-display'}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
