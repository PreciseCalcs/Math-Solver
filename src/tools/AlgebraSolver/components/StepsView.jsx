import React, { useState, useEffect } from 'react';
import {
  Share2,
  Code2,
  FileText,
  Printer,
  Copy,
  Check,
  Download,
  GraduationCap,
  CheckCircle2,
  ChevronDown,
  ChevronsUpDown,
  Layers,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { MathBlock } from './MathBlock';
import { ExportShareModal } from './ExportShareModal';
import {
  copyToClipboard,
  buildShareUrl,
  generateLatexDocument,
  generateMarkdown,
  cleanPlainMath,
} from '../utils/exportUtils';

export const StepsView = ({
  result,
  problemTitle,
  problemTex,
  shareParams = {},
  decimal = false,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  const totalSteps = result?.steps?.length || 0;

  // Track expanded state for each individual step (default all expanded)
  const [expandedSteps, setExpandedSteps] = useState(() => {
    const init = {};
    for (let i = 0; i < totalSteps; i++) {
      init[i] = true;
    }
    return init;
  });

  // Reset steps expansion when result changes
  useEffect(() => {
    if (result?.steps) {
      const next = {};
      result.steps.forEach((_, i) => {
        next[i] = true;
      });
      setExpandedSteps(next);
    }
  }, [result]);

  if (!result) return null;

  if (result.error) {
    return (
      <div className="as-error" data-testid="solver-error">
        <strong>Could not solve</strong>
        <p>{result.error}</p>
      </div>
    );
  }

  const handleCopy = async (text, key) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2000);
    }
  };

  const handleShareLinkQuick = async () => {
    const url = buildShareUrl(shareParams);
    await handleCopy(url, 'quick-link');
  };

  const handleQuickCopyLatex = async () => {
    const fullLatex = generateLatexDocument({
      problemTitle,
      problemTex,
      steps: result.steps || [],
      answerTex: result.answerTex,
      answerNote: result.answerNote,
    });
    await handleCopy(fullLatex, 'quick-latex');
  };

  const handleQuickCopyMarkdown = async () => {
    const md = generateMarkdown({
      problemTitle,
      problemTex,
      steps: result.steps || [],
      answerTex: result.answerTex,
      answerNote: result.answerNote,
    });
    await handleCopy(md, 'quick-md');
  };

  const handlePrint = () => {
    window.print();
  };

  const allExpanded =
    totalSteps > 0 &&
    Object.keys(expandedSteps).length === totalSteps &&
    Object.values(expandedSteps).every(Boolean);

  const toggleAllSteps = () => {
    if (allExpanded) {
      setExpandedSteps({});
    } else {
      const next = {};
      for (let i = 0; i < totalSteps; i++) next[i] = true;
      setExpandedSteps(next);
    }
  };

  const toggleStep = (index) => {
    setExpandedSteps((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const plainAnswer = cleanPlainMath(result.answerTex);

  return (
    <div className="as-results" data-testid="solver-results">
      {/* PRINT-ONLY HOMEWORK HEADER (visible only on paper / PDF) */}
      <div className="as-print-header" aria-hidden="true">
        <div className="as-print-title-row">
          <div>
            <h1 className="as-print-main-title">ALGEBRA &amp; SYMBOLIC DERIVATION REPORT</h1>
            <p className="as-print-subtitle">Step-by-step mathematical derivation &amp; verification</p>
          </div>
          <div className="as-print-meta-grid">
            <div><span className="as-print-meta-label">Date:</span> {new Date().toLocaleDateString()}</div>
            <div><span className="as-print-meta-label">Student:</span> ___________________________</div>
            <div><span className="as-print-meta-label">Course:</span> ___________________________</div>
          </div>
        </div>
        {problemTex && (
          <div className="as-print-problem-box">
            <span className="as-print-problem-label">PROBLEM STATEMENT:</span>
            <div className="as-print-problem-math">
              <MathBlock tex={problemTex} />
            </div>
          </div>
        )}
      </div>

      {/* STUDENT UTILITY ACTION BAR */}
      <div className="as-student-toolbar" data-testid="student-toolbar">
        <div className="as-student-toolbar-info">
          <span className="as-student-badge">
            <GraduationCap size={13} />
            <span>Solution Workspace</span>
          </span>
          {totalSteps > 0 && (
            <span className="as-steps-count-badge">
              {totalSteps} {totalSteps === 1 ? 'step' : 'steps'}
            </span>
          )}
        </div>

        <div className="as-student-toolbar-actions">
          {/* Quick Share Link */}
          <button
            type="button"
            className="as-student-action-btn"
            onClick={handleShareLinkQuick}
            title="Copy shareable link with this exact problem"
            data-testid="student-share-link-btn"
          >
            {copiedKey === 'quick-link' ? <Check size={12} className="text-emerald-600" /> : <Share2 size={12} />}
            <span>{copiedKey === 'quick-link' ? 'Link Copied!' : 'Share Link'}</span>
          </button>

          {/* Quick Copy LaTeX */}
          <button
            type="button"
            className="as-student-action-btn"
            onClick={handleQuickCopyLatex}
            title="Copy Overleaf-ready LaTeX document"
            data-testid="student-copy-latex-btn"
          >
            {copiedKey === 'quick-latex' ? <Check size={12} className="text-emerald-600" /> : <Code2 size={12} />}
            <span>{copiedKey === 'quick-latex' ? 'LaTeX Copied!' : 'Copy LaTeX'}</span>
          </button>

          {/* Quick Copy Markdown */}
          <button
            type="button"
            className="as-student-action-btn"
            onClick={handleQuickCopyMarkdown}
            title="Copy Markdown for Notion, Obsidian, or Discord"
            data-testid="student-copy-md-btn"
          >
            {copiedKey === 'quick-md' ? <Check size={12} className="text-emerald-600" /> : <FileText size={12} />}
            <span>{copiedKey === 'quick-md' ? 'Markdown Copied!' : 'Copy Markdown'}</span>
          </button>

          {/* Print / Save as PDF */}
          <button
            type="button"
            className="as-student-action-btn"
            onClick={handlePrint}
            title="Print clean homework derivation or save as PDF"
            data-testid="student-print-pdf-btn"
          >
            <Printer size={12} />
            <span>Print / PDF</span>
          </button>

          {/* Open Full Export & Share Workspace */}
          <button
            type="button"
            className="as-student-action-btn highlighted"
            onClick={() => setModalOpen(true)}
            title="Open Export & Share workspace (QR code, Overleaf, templates)"
            data-testid="student-export-modal-trigger"
          >
            <Download size={12} />
            <span>Export &amp; Share</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          PROMINENT HERO RESULT CARD (Instant High-Visibility Answer at Top)
          ========================================================================= */}
      {result.answerTex ? (
        <div
          className="as-hero-result-card"
          data-testid="hero-result-card"
          id="solver-hero-answer"
        >
          {/* Also support existing test selector */}
          <div className="as-hero-result-hidden-alias" data-testid="solver-answer" aria-hidden="true" />

          <div className="as-hero-result-header">
            <div className="as-hero-badge-group">
              <span className="as-hero-badge">
                <CheckCircle2 size={14} className="as-hero-badge-icon" />
                <span>Final Solution</span>
              </span>
              {result.answerNote && (
                <span className="as-hero-note-badge" title={result.answerNote}>
                  <Sparkles size={11} />
                  <span>{result.answerNote}</span>
                </span>
              )}
              {totalSteps > 0 && (
                <span className="as-hero-steps-badge">
                  <Layers size={11} />
                  <span>{totalSteps} derivation {totalSteps === 1 ? 'step' : 'steps'}</span>
                </span>
              )}
            </div>

            <div className="as-hero-quick-actions">
              <button
                type="button"
                className="as-hero-action-pill"
                onClick={() => handleCopy(result.answerTex, 'hero-tex')}
                title="Copy final answer as LaTeX"
                data-testid="copy-answer-tex-btn"
              >
                {copiedKey === 'hero-tex' ? <Check size={11} /> : <Copy size={11} />}
                <span>{copiedKey === 'hero-tex' ? 'Copied TeX' : 'Copy LaTeX'}</span>
              </button>
              {plainAnswer && (
                <button
                  type="button"
                  className="as-hero-action-pill"
                  onClick={() => handleCopy(plainAnswer, 'hero-plain')}
                  title="Copy final answer as plain text"
                  data-testid="copy-answer-plain-btn"
                >
                  {copiedKey === 'hero-plain' ? <Check size={11} /> : <Copy size={11} />}
                  <span>{copiedKey === 'hero-plain' ? 'Copied Plain' : 'Copy Plain'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Hero Math Display with High Contrast Typography */}
          <div className="as-hero-math-display" data-testid="hero-math-display">
            <MathBlock tex={result.answerTex} />
          </div>

          {/* Hero Card Footer Controls */}
          {totalSteps > 0 && (
            <div className="as-hero-result-footer">
              <button
                type="button"
                className="as-hero-toggle-steps-btn"
                onClick={toggleAllSteps}
                data-testid="hero-toggle-steps-btn"
              >
                {allExpanded ? <EyeOff size={13} /> : <Eye size={13} />}
                <span>{allExpanded ? 'Collapse derivation steps' : `Expand all ${totalSteps} derivation steps`}</span>
              </button>

              <button
                type="button"
                className="as-hero-export-link"
                onClick={() => setModalOpen(true)}
                data-testid="hero-export-link"
              >
                <Share2 size={12} />
                <span>Export &amp; Share</span>
              </button>
            </div>
          )}
        </div>
      ) : null}

      {/* =========================================================================
          COLLAPSIBLE STEPS SECTION (Step-by-Step Derivation with Accordion Cards)
          ========================================================================= */}
      {totalSteps > 0 && (
        <div className="as-steps-section" data-testid="steps-section">
          <div className="as-steps-section-header">
            <div className="as-steps-section-title-group">
              <h3 className="as-steps-section-title">Step-by-Step Derivation</h3>
              <span className="as-steps-section-counter">
                {totalSteps} {totalSteps === 1 ? 'step' : 'steps'}
              </span>
            </div>

            <div className="as-steps-section-controls">
              <button
                type="button"
                className="as-steps-toggle-all-btn"
                onClick={toggleAllSteps}
                title={allExpanded ? 'Collapse all steps' : 'Expand all steps'}
                data-testid="toggle-all-steps-btn"
              >
                <ChevronsUpDown size={13} />
                <span>{allExpanded ? 'Collapse all' : 'Expand all'}</span>
              </button>
            </div>
          </div>

          {/* Accordion Steps List */}
          <div className="as-steps-list" role="region" aria-label="Step-by-step derivation">
            {result.steps.map((s, i) => {
              const isExpanded = !!expandedSteps[i];
              return (
                <div
                  key={i}
                  className={`as-step-card ${isExpanded ? 'expanded' : 'collapsed'}`}
                  data-testid={`solver-step-${i + 1}`}
                >
                  <div
                    className="as-step-card-header"
                    onClick={() => toggleStep(i)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleStep(i);
                      }
                    }}
                    aria-expanded={isExpanded}
                    aria-controls={`step-content-${i}`}
                    data-testid={`step-header-${i + 1}`}
                  >
                    <div className="as-step-card-header-left">
                      <span className="as-step-num-pill">{i + 1}</span>
                      <span className="as-step-card-title">{s.title}</span>
                    </div>

                    <div className="as-step-card-header-right">
                      {/* Quick copy step LaTeX */}
                      {s.tex && (
                        <button
                          type="button"
                          className="as-step-copy-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(s.tex, `step-${i}`);
                          }}
                          title="Copy step LaTeX formula"
                          data-testid={`copy-step-${i + 1}-btn`}
                        >
                          {copiedKey === `step-${i}` ? <Check size={11} /> : <Copy size={11} />}
                          <span>{copiedKey === `step-${i}` ? 'Copied' : 'LaTeX'}</span>
                        </button>
                      )}
                      <span className={`as-step-chevron ${isExpanded ? 'open' : ''}`} aria-hidden="true">
                        <ChevronDown size={15} />
                      </span>
                    </div>
                  </div>

                  {/* Collapsible Step Body */}
                  {isExpanded && (
                    <div
                      id={`step-content-${i}`}
                      className="as-step-card-body"
                      data-testid={`step-body-${i + 1}`}
                    >
                      {s.desc ? <p className="as-step-desc">{s.desc}</p> : null}
                      {s.tex ? (
                        <div className="as-step-math">
                          <MathBlock tex={s.tex} />
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FULL EXPORT & SHARE MODAL */}
      <ExportShareModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        result={result}
        problemTitle={problemTitle}
        problemTex={problemTex}
        shareParams={shareParams}
        decimal={decimal}
      />
    </div>
  );
};
