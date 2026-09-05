import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Sparkles, CheckCircle2, Clock, Code, BookOpen } from 'lucide-react';
import { ToolSuiteHeader } from '../components/ToolSuiteHeader';
import { MathBlock } from './AlgebraSolver/components/MathBlock';

export function UpcomingToolPreview({
  title,
  subtitle,
  category,
  icon: Icon,
  color,
  plannedFeatures = [],
  exampleFormulas = [],
  relatedActiveTools = [],
}) {
  return (
    <div className="algebra-solver precise-calcs-app" data-testid="upcoming-tool-preview">
      <ToolSuiteHeader />
      <main className="as-main">
        {/* Hero Header */}
        <div className="as-standalone-hero" style={{ '--tool-accent': color }}>
          <div className="as-standalone-hero-top">
            <Link to="/tools" className="as-back-link" title="Return to tools directory">
              <ArrowLeft size={14} />
              <span>All Tools</span>
            </Link>
            <div className="as-standalone-pills">
              <span className="as-category-pill">{category}</span>
              <span className="as-status-pill as-status-upcoming">
                <Clock size={12} /> Roadmap / Phase 2
              </span>
            </div>
          </div>

          <div className="as-standalone-hero-content">
            <div className="as-standalone-hero-icon" style={{ background: color }}>
              <Icon size={26} />
            </div>
            <div>
              <h1 className="as-standalone-hero-title">{title}</h1>
              <p className="as-standalone-hero-subtitle">{subtitle}</p>
            </div>
          </div>
        </div>

        {/* Roadmap Preview Card */}
        <div className="as-card as-upcoming-card">
          <div className="as-upcoming-notice-bar">
            <Sparkles size={18} className="as-upcoming-notice-icon" style={{ color }} />
            <div>
              <strong>Calculator Architecture Initialized:</strong> This dedicated module is registered in the PreciseCalcs router and prepared for engine integration in the next phase.
            </div>
          </div>

          {/* Planned Capabilities Grid */}
          <div className="as-upcoming-section">
            <h3 className="as-upcoming-section-title">
              <CheckCircle2 size={16} /> Planned Solver Capabilities
            </h3>
            <div className="as-upcoming-features-grid">
              {plannedFeatures.map((feat, idx) => (
                <div key={idx} className="as-upcoming-feature-item">
                  <div className="as-upcoming-feature-bullet" style={{ background: color }} />
                  <div>
                    <h4 className="as-upcoming-feature-name">{feat.name}</h4>
                    <p className="as-upcoming-feature-desc">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preview Math Expressions */}
          {exampleFormulas.length > 0 && (
            <div className="as-upcoming-section">
              <h3 className="as-upcoming-section-title">
                <BookOpen size={16} /> Target Mathematical Syntax & Formulas
              </h3>
              <div className="as-upcoming-formulas-list">
                {exampleFormulas.map((item, idx) => (
                  <div key={idx} className="as-upcoming-formula-card">
                    <span className="as-upcoming-formula-label">{item.label}</span>
                    <div className="as-upcoming-formula-math">
                      <MathBlock tex={item.tex} inline={true} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cross Links to Active Tools */}
          <div className="as-upcoming-section">
            <h3 className="as-upcoming-section-title">
              <Code size={16} /> Currently Active Mathematical Tools
            </h3>
            <div className="as-upcoming-tools-recommendations">
              {relatedActiveTools.map((tool, idx) => (
                <Link key={idx} to={tool.path} className="as-upcoming-tool-link">
                  <span>{tool.title}</span>
                  <ArrowRight size={13} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
