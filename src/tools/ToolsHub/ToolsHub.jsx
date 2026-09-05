import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FunctionSquare,
  Rows3,
  Grid3x3,
  Divide,
  Sigma,
  Hash,
  TrendingUp,
  Boxes,
  Compass,
  Calculator,
  ArrowRight,
  Sparkles,
  Layers,
  Search,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { ToolSuiteHeader, ACTIVE_TOOLS, UPCOMING_TOOLS } from '../../components/ToolSuiteHeader';
import { MathBlock } from '../AlgebraSolver/components/MathBlock';

export default function ToolsHub() {
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const allTools = [
    ...ACTIVE_TOOLS.map((t) => ({ ...t, status: 'active' })),
    ...UPCOMING_TOOLS.map((t) => ({ ...t, status: 'upcoming' })),
  ];

  const filteredTools = allTools.filter((tool) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'active' && tool.status === 'active') ||
      (filter === 'upcoming' && tool.status === 'upcoming') ||
      tool.category.toLowerCase().includes(filter.toLowerCase());

    const matchesSearch =
      !searchQuery.trim() ||
      tool.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.category.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="algebra-solver precise-calcs-app" data-testid="tools-hub">
      <ToolSuiteHeader />

      <main className="as-main as-hub-main">
        {/* Hub Hero Banner */}
        <div className="as-hub-hero">
          <div className="as-hub-hero-badge">
            <Sparkles size={13} />
            <span>Mathematical Suite & Standalone Workstations</span>
          </div>
          <h1 className="as-hub-hero-title">Precision Mathematical Calculators</h1>
          <p className="as-hub-hero-desc">
            Explore dedicated standalone tools with step-by-step symbolic and numerical derivations,
            interactive 2D coordinate graphing, exact fraction arithmetic, and mathematical export.
          </p>

          {/* Search & Filter Bar */}
          <div className="as-hub-search-bar">
            <div className="as-hub-search-input-wrap">
              <Search size={16} className="as-hub-search-icon" />
              <input
                type="text"
                placeholder="Search calculators by name, method (e.g. matrix, Cramer, synthetic, series)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="as-hub-search-input"
              />
            </div>

            <div className="as-hub-filter-pills">
              {['all', 'active', 'upcoming', 'Algebra', 'Linear Algebra', 'Analysis'].map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`as-hub-filter-btn ${filter === f ? 'active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Multi-Tab Suite Quick Banner */}
        <div className="as-hub-unified-banner">
          <div className="as-hub-unified-content">
            <div className="as-hub-unified-icon">
              <Layers size={20} />
            </div>
            <div>
              <h3 className="as-hub-unified-title">Looking for the All-in-One Multi-Tab Solver?</h3>
              <p className="as-hub-unified-desc">
                Access all 6 algebraic calculators grouped together inside a single unified tabbed workspace.
              </p>
            </div>
          </div>
          <Link to="/algebra-solver" className="as-hub-unified-btn">
            <span>Launch Multi-Tab Solver</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Section: Active Standalone Tools */}
        <div className="as-hub-section">
          <div className="as-hub-section-header">
            <div>
              <h2 className="as-hub-section-title">Active Standalone Calculators</h2>
              <p className="as-hub-section-subtitle">
                Fully functional tools with step-by-step solutions, history tracking, and decimal toggle.
              </p>
            </div>
            <span className="as-hub-count-badge">
              {filteredTools.filter((t) => t.status === 'active').length} Tools
            </span>
          </div>

          <div className="as-hub-grid">
            {filteredTools
              .filter((t) => t.status === 'active')
              .map((tool) => {
                const Icon = tool.icon;
                return (
                  <Link
                    key={tool.path}
                    to={tool.path}
                    className="as-hub-card"
                    style={{ '--card-accent': tool.color }}
                  >
                    <div className="as-hub-card-header">
                      <div className="as-hub-card-icon" style={{ background: tool.color }}>
                        <Icon size={20} />
                      </div>
                      <div className="as-hub-card-badges">
                        <span className="as-category-pill">{tool.category}</span>
                        <span className="as-status-pill as-status-active">
                          <CheckCircle2 size={11} /> Ready
                        </span>
                      </div>
                    </div>

                    <h3 className="as-hub-card-title">{tool.label} Calculator</h3>
                    <p className="as-hub-card-desc">{tool.desc}</p>

                    <div className="as-hub-card-footer">
                      <span className="as-hub-card-cta">
                        Launch Standalone Tool <ArrowRight size={13} />
                      </span>
                    </div>
                  </Link>
                );
              })}
          </div>
        </div>

        {/* Section: Upcoming Expansion Tools */}
        <div className="as-hub-section as-hub-section-upcoming">
          <div className="as-hub-section-header">
            <div>
              <h2 className="as-hub-section-title">Upcoming Calculators (Next Expansion)</h2>
              <p className="as-hub-section-subtitle">
                Planned mathematical engines for calculus, vectors, numerical analysis, and trigonometry.
              </p>
            </div>
            <span className="as-hub-count-badge as-hub-count-upcoming">
              {filteredTools.filter((t) => t.status === 'upcoming').length} In Roadmap
            </span>
          </div>

          <div className="as-hub-grid">
            {filteredTools
              .filter((t) => t.status === 'upcoming')
              .map((tool) => {
                const Icon = tool.icon;
                return (
                  <Link
                    key={tool.path}
                    to={tool.path}
                    className="as-hub-card as-hub-card-upcoming"
                    style={{ '--card-accent': tool.color }}
                  >
                    <div className="as-hub-card-header">
                      <div className="as-hub-card-icon" style={{ background: tool.color }}>
                        <Icon size={20} />
                      </div>
                      <div className="as-hub-card-badges">
                        <span className="as-category-pill">{tool.category}</span>
                        <span className="as-status-pill as-status-upcoming">
                          <Clock size={11} /> Roadmap
                        </span>
                      </div>
                    </div>

                    <h3 className="as-hub-card-title">{tool.label} Calculator</h3>
                    <p className="as-hub-card-desc">{tool.desc}</p>

                    <div className="as-hub-card-footer">
                      <span className="as-hub-card-cta">
                        View Roadmap & Preview <ArrowRight size={13} />
                      </span>
                    </div>
                  </Link>
                );
              })}
          </div>
        </div>
      </main>
    </div>
  );
}
