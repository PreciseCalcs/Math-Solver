// Utility functions for student export & share features: LaTeX, Markdown, Plaintext, Share URLs
import QRCode from 'qrcode';

/**
 * Strips HTML or KaTeX formatting artifacts to extract plain text
 */
export function cleanPlainMath(tex) {
  if (!tex) return '';
  return String(tex)
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
    .replace(/\\cdot/g, '·')
    .replace(/\\times/g, '×')
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
    .replace(/\\left\[/g, '[')
    .replace(/\\right\]/g, ']')
    .replace(/\\left\(/g, '(')
    .replace(/\\right\)/g, ')')
    .replace(/\\neq/g, '≠')
    .replace(/\\le/g, '≤')
    .replace(/\\ge/g, '≥')
    .replace(/\\pm/g, '±')
    .replace(/\\quad/g, ' ')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\/g, '')
    .replace(/[{}]/g, '')
    .trim();
}

/**
 * Generates a full, compilable LaTeX document template (Overleaf / LaTeX ready)
 */
export function generateLatexDocument({ problemTitle, problemTex, steps = [], answerTex, answerNote }) {
  const cleanTitle = problemTitle ? problemTitle.replace(/[#$%&_]/g, '\\$&') : 'Algebra Solution';
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const stepsLatex = steps
    .map((step, idx) => {
      const title = (step.title || `Step ${idx + 1}`).replace(/[#$%&_]/g, '\\$&');
      const desc = step.desc ? `\n${step.desc.replace(/[#$%&_]/g, '\\$&')}\n` : '';
      const mathBlock = step.tex ? `\n\\[\n${step.tex}\n\\]\n` : '';
      return `\\subsection*{Step ${idx + 1}: ${title}}${desc}${mathBlock}`;
    })
    .join('\n');

  const answerSection = answerTex
    ? `\\section*{Final Answer}
\\begin{center}
\\fbox{\\parbox{0.88\\textwidth}{
\\vspace{0.2em}
\\[
${answerTex}
\\]
${answerNote ? `\\small{\\textit{${answerNote.replace(/[#$%&_]/g, '\\$&')}}}` : ''}
\\vspace{0.2em}
}}
\\end{center}`
    : '';

  return `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath,amssymb,amsfonts}
\\usepackage{geometry}
\\usepackage{fancyhdr}
\\geometry{margin=1in}

\\pagestyle{fancy}
\\fancyhf{}
\\rhead{Advanced Algebra Solver}
\\lhead{Homework Derivation}
\\rfoot{Page \\thepage}

\\title{${cleanTitle}}
\\author{Student Homework Report}
\\date{${today}}

\\begin{document}
\\maketitle

\\section*{Problem Statement}
${problemTex ? `\\[\n${problemTex}\n\\]` : `\\textbf{${cleanTitle}}`}

\\section*{Step-by-Step Derivation}
${stepsLatex || '\\textit{Direct evaluation with no intermediate steps.}'}

${answerSection}

\\vfill
\\noindent\\rule{\\textwidth}{0.4pt}
\\begin{center}
\\small\\textit{Generated with Advanced Algebra \\& Symbolic Solver}
\\end{center}

\\end{document}
`;
}

/**
 * Generates an align* LaTeX snippet for dropping into existing student documents
 */
export function generateLatexSnippet({ problemTex, steps = [], answerTex }) {
  let output = `% --- Algebra Derivation Snippet ---\n`;
  if (problemTex) {
    output += `% Problem:\n\\[\n${problemTex}\n\\]\n\n`;
  }
  output += `\\begin{aligned}\n`;
  steps.forEach((s, idx) => {
    output += `  % Step ${idx + 1}: ${s.title || ''}\n`;
    if (s.tex) {
      output += `  & ${s.tex} \\\\\n`;
    }
  });
  if (answerTex) {
    output += `  % Final Answer:\n`;
    output += `  & \\boxed{${answerTex}}\n`;
  }
  output += `\\end{aligned}\n`;
  return output;
}

/**
 * Generates a structured Markdown solution for Notion, Obsidian, Canvas, or Discord
 */
export function generateMarkdown({ problemTitle, problemTex, steps = [], answerTex, answerNote }) {
  const title = problemTitle || 'Algebra Solution';
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  let md = `# ${title}\n\n`;
  md += `*Generated on ${today} with Advanced Algebra & Symbolic Solver*\n\n`;

  if (problemTex) {
    md += `## Problem\n\n$$\n${problemTex}\n$$\n\n`;
  }

  md += `## Step-by-Step Derivation\n\n`;
  if (steps.length === 0) {
    md += `*Direct evaluation.*\n\n`;
  } else {
    steps.forEach((s, i) => {
      md += `### Step ${i + 1}: ${s.title}\n\n`;
      if (s.desc) {
        md += `${s.desc}\n\n`;
      }
      if (s.tex) {
        md += `$$\n${s.tex}\n$$\n\n`;
      }
    });
  }

  if (answerTex) {
    md += `## Final Answer\n\n`;
    md += `> **$$\n> ${answerTex}\n> $$**\n\n`;
    if (answerNote) {
      md += `*Note: ${answerNote}*\n\n`;
    }
  }

  md += `---\n*Exported for student study notes & homework.*`;
  return md;
}

/**
 * Generates clean plain text representation
 */
export function generatePlainText({ problemTitle, problemTex, steps = [], answerTex, answerNote }) {
  let text = `========================================================\n`;
  text += `${problemTitle || 'ALGEBRA SOLUTION REPORT'}\n`;
  text += `Date: ${new Date().toLocaleDateString()}\n`;
  text += `========================================================\n\n`;

  if (problemTex) {
    text += `PROBLEM:\n  ${cleanPlainMath(problemTex)}\n\n`;
  }

  text += `DERIVATION STEPS:\n`;
  steps.forEach((s, i) => {
    text += `[Step ${i + 1}] ${s.title}\n`;
    if (s.desc) text += `  Explanation: ${s.desc}\n`;
    if (s.tex) text += `  Math: ${cleanPlainMath(s.tex)}\n`;
    text += `\n`;
  });

  if (answerTex) {
    text += `========================================================\n`;
    text += `FINAL ANSWER:\n  ${cleanPlainMath(answerTex)}\n`;
    if (answerNote) text += `  (${answerNote})\n`;
    text += `========================================================\n`;
  }

  return text;
}

/**
 * Triggers safe browser file download
 */
export function downloadFile(filename, content, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

/**
 * Robust clipboard copy with fallback
 */
export async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fallback to execCommand below
    }
  }

  // Fallback for iframe restrictions or older browsers
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    document.body.removeChild(textArea);
    console.error('Copy failed', err);
    return false;
  }
}

/**
 * Builds a shareable URL containing problem query params
 */
export function buildShareUrl(shareParams = {}) {
  const url = new URL(window.location.href);
  // Clear existing specific solver params
  ['tab', 'q', 'dec', 'vars', 'eqs', 'op', 'mat', 'mode', 'a', 'd', 'n', 'r', 'expr', 'varName', 'from', 'to', 'b'].forEach(
    (k) => url.searchParams.delete(k)
  );

  // Set new params
  Object.entries(shareParams).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      url.searchParams.set(key, String(val));
    }
  });

  return url.toString();
}

/**
 * Generates a high-contrast QR code Data URL for mobile sharing
 */
export async function generateQrCode(text) {
  try {
    return await QRCode.toDataURL(text, {
      width: 200,
      margin: 1,
      color: {
        dark: '#2b2118',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('QR code generation failed:', err);
    return null;
  }
}
