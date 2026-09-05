import React, { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  FunctionSquare,
  Rows3,
  Grid3x3,
  Divide,
  Sigma,
  Hash,
  LayoutGrid,
  ChevronDown,
  Sparkles,
  Compass,
  ArrowRight,
  TrendingUp,
  Boxes,
  Calculator,
} from 'lucide-react';

export const ACTIVE_TOOLS = [
  {
    path: '/equations',
    label: 'Equations',
    icon: FunctionSquare,
    badge: 'Active',
    category: 'Algebra',
    color: '#c8522a',
    desc: 'Linear, quadratic, polynomial, rational & inequalities',
  },
  {
    path: '/system-of-equations',
    label: 'Systems',
    icon: Rows3,
    badge: 'Active',
    category: 'Algebra',
    color: '#0d9488',
    desc: 'Gauss-Jordan, Cramer’s rule, substitution & inversion',
  },
  {
    path: '/matrix',
    label: 'Matrix',
    icon: Grid3x3,
    badge: 'Active',
    category: 'Linear Algebra',
    color: '#4f46e5',
    desc: 'Determinants, inverses, eigenvalues, rank & RREF',
  },
  {
    path: '/polynomial',
    label: 'Polynomial',
    icon: Divide,
    badge: 'Active',
    category: 'Algebra',
    color: '#d97706',
    desc: 'Long division, synthetic division & multiplication',
  },
  {
    path: '/series',
    label: 'Series',
    icon: Sigma,
    badge: 'Active',
    category: 'Analysis',
    color: '#0284c7',
    desc: 'Arithmetic, geometric, sigma sums & binomial expansion',
  },
  {
    path: '/complex',
    label: 'Complex',
    icon: Hash,
    badge: 'Active',
    category: 'Arithmetic',
    color: '#7c3aed',
    desc: 'Arithmetic, polar form, conjugates & powers',
  },
];

export const UPCOMING_TOOLS = [
  {
    path: '/calculus',
    label: 'Calculus',
    icon: TrendingUp,
    badge: 'Upcoming',
    category: 'Calculus',
    color: '#e11d48',
    desc: 'Derivatives, integrals, limits & Taylor series',
  },
  {
    path: '/vectors',
    label: 'Vectors',
    icon: Boxes,
    badge: 'Upcoming',
    category: 'Linear Algebra',
    color: '#ea580c',
    desc: 'Dot & cross products, projections & basis',
  },
  {
    path: '/numerical-methods',
    label: 'Numerical Methods',
    icon: Compass,
    badge: 'Upcoming',
    category: 'Computational',
    color: '#059669',
    desc: 'Newton-Raphson, Bisection, Runge-Kutta & quadrature',
  },
  {
    path: '/trigonometry',
    label: 'Trigonometry',
    icon: Calculator,
    badge: 'Upcoming',
    category: 'Trigonometry',
    color: '#2563eb',
    desc: 'Identities, triangle solver, unit circle & harmonics',
  },
];

export const ToolSuiteHeader = () => {
  const [showUpcomingMenu, setShowUpcomingMenu] = useState(false);
  const location = useLocation();

  const isUpcomingActive = UPCOMING_TOOLS.some((t) => location.pathname.startsWith(t.path));

  return (
    <header className="as-suite-header" data-testid="suite-header">
      <div className="as-suite-header-inner">
        {/* Brand & Suite Identity */}
        <div className="as-suite-brand-area">
          <Link to="/tools" className="as-suite-brand-link" title="PreciseCalcs Tools Hub">
            <div className="as-suite-brand-logo">
              <Sparkles size={20} />
            </div>
            <div className="as-suite-brand-text">
              <div className="as-suite-brand-title">
                PreciseCalcs <span className="as-suite-badge">Suite</span>
              </div>
              <div className="as-suite-brand-tagline">Mathematical Solvers & Workstations</div>
            </div>
          </Link>
        </div>

        {/* Primary Navigation for Active Standalone Tools */}
        <nav className="as-suite-nav" aria-label="Math Tools Navigation">
          <NavLink
            to="/tools"
            className={({ isActive }) =>
              `as-suite-nav-link ${isActive ? 'active' : ''}`
            }
            title="All Calculators Directory"
          >
            <LayoutGrid size={15} />
            <span>All Tools</span>
          </NavLink>

          {ACTIVE_TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <NavLink
                key={tool.path}
                to={tool.path}
                className={({ isActive }) =>
                  `as-suite-nav-link ${isActive ? 'active' : ''}`
                }
                title={tool.desc}
              >
                <Icon size={15} />
                <span>{tool.label}</span>
              </NavLink>
            );
          })}

          {/* Upcoming Tools Dropdown Menu */}
          <div className="as-suite-dropdown-container">
            <button
              type="button"
              className={`as-suite-nav-link as-suite-dropdown-trigger ${isUpcomingActive || showUpcomingMenu ? 'active' : ''}`}
              onClick={() => setShowUpcomingMenu((v) => !v)}
              onBlur={(e) => {
                // Close if clicked outside
                if (!e.currentTarget.contains(e.relatedTarget)) {
                  setTimeout(() => setShowUpcomingMenu(false), 200);
                }
              }}
              title="More calculators (Calculus, Vectors, Numerical Methods, Trigonometry)"
            >
              <Compass size={15} />
              <span>More Tools</span>
              <span className="as-suite-upcoming-pill">4 Soon</span>
              <ChevronDown size={13} className={`as-suite-chevron ${showUpcomingMenu ? 'open' : ''}`} />
            </button>

            {showUpcomingMenu && (
              <div className="as-suite-dropdown-menu" data-testid="upcoming-tools-dropdown">
                <div className="as-suite-dropdown-header">
                  <span>Upcoming Expansion Tools</span>
                </div>
                {UPCOMING_TOOLS.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <Link
                      key={tool.path}
                      to={tool.path}
                      className="as-suite-dropdown-item"
                      onClick={() => setShowUpcomingMenu(false)}
                    >
                      <div className="as-suite-dropdown-item-icon" style={{ color: tool.color }}>
                        <Icon size={16} />
                      </div>
                      <div className="as-suite-dropdown-item-content">
                        <div className="as-suite-dropdown-item-title">
                          <span>{tool.label}</span>
                          <span className="as-suite-badge-mini">Preview</span>
                        </div>
                        <p className="as-suite-dropdown-item-desc">{tool.desc}</p>
                      </div>
                      <ArrowRight size={13} className="as-suite-dropdown-item-arrow" />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};
