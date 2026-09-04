import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Code2,
  FileText,
  Printer,
  Copy,
  Check,
  Download,
  QrCode,
  GraduationCap,
  Sparkles,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import {
  generateLatexDocument,
  generateLatexSnippet,
  generateMarkdown,
  generatePlainText,
  downloadFile,
  copyToClipboard,
  buildShareUrl,
  generateQrCode,
} from '../utils/exportUtils';

export const ExportShareModal = ({
  isOpen,
  onClose,
  result,
  problemTitle,
  problemTex,
  shareParams,
  decimal,
}) => {
  const [activeTab, setActiveTab] = useState('share'); // 'share' | 'latex' | 'markdown' | 'text' | 'print'
  const [latexMode, setLatexMode] = useState('full'); // 'full' | 'snippet'
  const [qrUrl, setQrUrl] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);

  const shareUrl = buildShareUrl(shareParams);

  // Generate QR code whenever shareUrl updates
  useEffect(() => {
    if (isOpen && shareUrl) {
      generateQrCode(shareUrl).then((url) => {
        if (url) setQrUrl(url);
      });
    }
  }, [isOpen, shareUrl]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !result) return null;

  const handleCopy = async (text, key) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2200);
    }
  };

  const latexFull = generateLatexDocument({
    problemTitle,
    problemTex,
    steps: result.steps || [],
    answerTex: result.answerTex,
    answerNote: result.answerNote,
  });

  const latexSnippet = generateLatexSnippet({
    problemTex,
    steps: result.steps || [],
    answerTex: result.answerTex,
  });

  const markdownContent = generateMarkdown({
    problemTitle,
    problemTex,
    steps: result.steps || [],
    answerTex: result.answerTex,
    answerNote: result.answerNote,
  });

  const plainTextContent = generatePlainText({
    problemTitle,
    problemTex,
    steps: result.steps || [],
    answerTex: result.answerTex,
    answerNote: result.answerNote,
  });

  const studyGroupMessage = `Check out this step-by-step solution for ${problemTitle || 'this problem'}:\n${shareUrl}`;

  const handlePrint = () => {
    onClose();
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="as-modal-backdrop" onClick={onClose} data-testid="export-modal-backdrop">
      <div
        className="as-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-modal-title"
        data-testid="export-modal"
      >
        {/* Modal Header */}
        <div className="as-modal-header">
          <div className="as-modal-header-info">
            <div className="as-modal-icon-badge" aria-hidden="true">
              <GraduationCap size={18} />
            </div>
            <div>
              <h2 id="export-modal-title" className="as-modal-title">
                Export &amp; Share Solution
              </h2>
              <p className="as-modal-subtitle">
                Student tools for homework reports, Overleaf, Notion &amp; peer collaboration
              </p>
            </div>
          </div>
          <button
            type="button"
            className="as-modal-close-btn"
            onClick={onClose}
            aria-label="Close export dialog"
            data-testid="export-modal-close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="as-modal-nav">
          <button
            type="button"
            className={`as-modal-nav-btn ${activeTab === 'share' ? 'active' : ''}`}
            onClick={() => setActiveTab('share')}
            data-testid="export-tab-share"
          >
            <Share2 size={14} />
            <span>Share &amp; QR</span>
          </button>
          <button
            type="button"
            className={`as-modal-nav-btn ${activeTab === 'latex' ? 'active' : ''}`}
            onClick={() => setActiveTab('latex')}
            data-testid="export-tab-latex"
          >
            <Code2 size={14} />
            <span>LaTeX (Overleaf)</span>
          </button>
          <button
            type="button"
            className={`as-modal-nav-btn ${activeTab === 'markdown' ? 'active' : ''}`}
            onClick={() => setActiveTab('markdown')}
            data-testid="export-tab-markdown"
          >
            <FileText size={14} />
            <span>Markdown</span>
          </button>
          <button
            type="button"
            className={`as-modal-nav-btn ${activeTab === 'text' ? 'active' : ''}`}
            onClick={() => setActiveTab('text')}
            data-testid="export-tab-text"
          >
            <BookOpen size={14} />
            <span>Plain Text</span>
          </button>
          <button
            type="button"
            className={`as-modal-nav-btn ${activeTab === 'print' ? 'active' : ''}`}
            onClick={() => setActiveTab('print')}
            data-testid="export-tab-print"
          >
            <Printer size={14} />
            <span>Print / PDF</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="as-modal-body">
          {/* TAB 1: SHARE & QR */}
          {activeTab === 'share' && (
            <div className="as-modal-pane" data-testid="pane-share">
              <div className="as-share-section">
                <label className="as-modal-field-label">Shareable Solution Link</label>
                <div className="as-share-input-row">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="as-share-url-input"
                    data-testid="share-url-input"
                    onClick={(e) => e.target.select()}
                  />
                  <button
                    type="button"
                    className="as-action-pill-btn primary"
                    onClick={() => handleCopy(shareUrl, 'link')}
                    data-testid="copy-share-url-btn"
                  >
                    {copiedKey === 'link' ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedKey === 'link' ? 'Copied Link!' : 'Copy Link'}</span>
                  </button>
                </div>
                <p className="as-modal-tip">
                  Anyone with this link can open the exact problem, derivation steps, and computed solution.
                </p>
              </div>

              <div className="as-qr-study-grid">
                {/* QR Code Card */}
                <div className="as-qr-box">
                  <div className="as-qr-badge">
                    <QrCode size={13} />
                    <span>Scan on Phone / Tablet</span>
                  </div>
                  {qrUrl ? (
                    <div className="as-qr-image-wrapper">
                      <img
                        src={qrUrl}
                        alt="QR Code to open this solution on mobile"
                        className="as-qr-image"
                        data-testid="share-qr-code"
                      />
                    </div>
                  ) : (
                    <div className="as-qr-placeholder">Generating QR code...</div>
                  )}
                  <span className="as-qr-subtext">Ideal for in-class presentations &amp; mobile study</span>
                </div>

                {/* Study Group Quick Share */}
                <div className="as-study-share-box">
                  <label className="as-modal-field-label">Study Group Message (Discord / WhatsApp)</label>
                  <textarea
                    readOnly
                    rows={3}
                    className="as-study-textarea"
                    value={studyGroupMessage}
                    onClick={(e) => e.target.select()}
                    data-testid="study-message-textarea"
                  />
                  <div className="as-study-actions">
                    <button
                      type="button"
                      className="as-action-pill-btn"
                      onClick={() => handleCopy(studyGroupMessage, 'msg')}
                      data-testid="copy-study-msg-btn"
                    >
                      {copiedKey === 'msg' ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copiedKey === 'msg' ? 'Copied Message!' : 'Copy Message'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LATEX (OVERLEAF READY) */}
          {activeTab === 'latex' && (
            <div className="as-modal-pane" data-testid="pane-latex">
              <div className="as-latex-toolbar">
                <div className="as-sub-toggle-group">
                  <button
                    type="button"
                    className={`as-sub-toggle ${latexMode === 'full' ? 'active' : ''}`}
                    onClick={() => setLatexMode('full')}
                  >
                    Full .tex Document
                  </button>
                  <button
                    type="button"
                    className={`as-sub-toggle ${latexMode === 'snippet' ? 'active' : ''}`}
                    onClick={() => setLatexMode('snippet')}
                  >
                    Math Snippet (aligned)
                  </button>
                </div>

                <div className="as-pane-actions">
                  <button
                    type="button"
                    className="as-action-pill-btn primary"
                    onClick={() =>
                      handleCopy(latexMode === 'full' ? latexFull : latexSnippet, 'latex')
                    }
                    data-testid="copy-latex-btn"
                  >
                    {copiedKey === 'latex' ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedKey === 'latex' ? 'Copied LaTeX!' : 'Copy LaTeX'}</span>
                  </button>
                  {latexMode === 'full' && (
                    <button
                      type="button"
                      className="as-action-pill-btn"
                      onClick={() =>
                        downloadFile(
                          `${(problemTitle || 'solution').toLowerCase().replace(/\s+/g, '_')}.tex`,
                          latexFull,
                          'text/x-tex'
                        )
                      }
                      data-testid="download-latex-btn"
                    >
                      <Download size={14} />
                      <span>Download .tex</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="as-code-preview-wrap">
                <pre className="as-code-preview" data-testid="latex-code-preview">
                  <code>{latexMode === 'full' ? latexFull : latexSnippet}</code>
                </pre>
              </div>

              <div className="as-info-callout">
                <Sparkles size={14} />
                <span>
                  <strong>Overleaf Ready:</strong> You can paste this directly into Overleaf or your LaTeX project. It includes geometry and fancyhdr for a formal homework handout.
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: MARKDOWN */}
          {activeTab === 'markdown' && (
            <div className="as-modal-pane" data-testid="pane-markdown">
              <div className="as-latex-toolbar">
                <div className="as-pane-tag">
                  <span>Formatted for Notion, Obsidian, GitHub &amp; Canvas</span>
                </div>
                <div className="as-pane-actions">
                  <button
                    type="button"
                    className="as-action-pill-btn primary"
                    onClick={() => handleCopy(markdownContent, 'md')}
                    data-testid="copy-markdown-btn"
                  >
                    {copiedKey === 'md' ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedKey === 'md' ? 'Copied Markdown!' : 'Copy Markdown'}</span>
                  </button>
                  <button
                    type="button"
                    className="as-action-pill-btn"
                    onClick={() =>
                      downloadFile(
                        `${(problemTitle || 'solution').toLowerCase().replace(/\s+/g, '_')}.md`,
                        markdownContent,
                        'text/markdown'
                      )
                    }
                    data-testid="download-markdown-btn"
                  >
                    <Download size={14} />
                    <span>Download .md</span>
                  </button>
                </div>
              </div>

              <div className="as-code-preview-wrap">
                <pre className="as-code-preview" data-testid="markdown-code-preview">
                  <code>{markdownContent}</code>
                </pre>
              </div>

              <div className="as-info-callout">
                <FileText size={14} />
                <span>
                  Math formulas are formatted inside standard KaTeX <code>$$...$$</code> delimiters, rendering equations directly in Obsidian, Notion, and GitHub.
                </span>
              </div>
            </div>
          )}

          {/* TAB 4: PLAIN TEXT */}
          {activeTab === 'text' && (
            <div className="as-modal-pane" data-testid="pane-text">
              <div className="as-latex-toolbar">
                <div className="as-pane-tag">
                  <span>Unicode plain text for email, Discord, or LMS text boxes</span>
                </div>
                <div className="as-pane-actions">
                  <button
                    type="button"
                    className="as-action-pill-btn primary"
                    onClick={() => handleCopy(plainTextContent, 'txt')}
                    data-testid="copy-text-btn"
                  >
                    {copiedKey === 'txt' ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedKey === 'txt' ? 'Copied Text!' : 'Copy Text'}</span>
                  </button>
                  <button
                    type="button"
                    className="as-action-pill-btn"
                    onClick={() =>
                      downloadFile(
                        `${(problemTitle || 'solution').toLowerCase().replace(/\s+/g, '_')}.txt`,
                        plainTextContent,
                        'text/plain'
                      )
                    }
                    data-testid="download-text-btn"
                  >
                    <Download size={14} />
                    <span>Download .txt</span>
                  </button>
                </div>
              </div>

              <div className="as-code-preview-wrap">
                <pre className="as-code-preview" data-testid="plain-code-preview">
                  <code>{plainTextContent}</code>
                </pre>
              </div>
            </div>
          )}

          {/* TAB 5: PRINT / PDF SHEET */}
          {activeTab === 'print' && (
            <div className="as-modal-pane" data-testid="pane-print">
              <div className="as-print-guide-card">
                <div className="as-print-icon-hero">
                  <Printer size={32} />
                </div>
                <h3 className="as-print-hero-title">Clean Homework Derivation Sheet</h3>
                <p className="as-print-hero-desc">
                  Opens your browser print dialog with our custom homework stylesheet. All interface navigation, keyboards, and buttons are automatically hidden, leaving an official, cleanly formatted homework solution ready for physical printing or saving as a PDF file.
                </p>

                <div className="as-print-features-list">
                  <div className="as-print-feature-item">
                    <Check size={14} className="text-emerald-600" />
                    <span>Includes Course, Date, and Student Name header lines</span>
                  </div>
                  <div className="as-print-feature-item">
                    <Check size={14} className="text-emerald-600" />
                    <span>High-contrast crisp vector math rendering</span>
                  </div>
                  <div className="as-print-feature-item">
                    <Check size={14} className="text-emerald-600" />
                    <span>Prominently highlighted, boxed Final Answer callout</span>
                  </div>
                  <div className="as-print-feature-item">
                    <Check size={14} className="text-emerald-600" />
                    <span>Page-break protection so derivations don't get split awkwardly</span>
                  </div>
                </div>

                <div className="as-print-actions">
                  <button
                    type="button"
                    className="as-action-pill-btn primary lg"
                    onClick={handlePrint}
                    data-testid="trigger-print-dialog-btn"
                  >
                    <Printer size={16} />
                    <span>Print / Save as PDF</span>
                  </button>
                </div>

                <p className="as-modal-subhint">
                  Tip: In your browser&apos;s Print preview dialog, select <strong>&quot;Save as PDF&quot;</strong> in the Destination dropdown to save directly to your drive.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
