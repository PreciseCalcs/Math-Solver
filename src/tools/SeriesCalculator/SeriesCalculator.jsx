import React from 'react';
import { Sigma } from 'lucide-react';
import { StandaloneToolLayout } from '../StandaloneToolLayout';
import { SeriesTab } from '../AlgebraSolver/tabs/SeriesTab';

export default function SeriesCalculator() {
  return (
    <StandaloneToolLayout
      toolKey="series"
      title="Series & Sequences Calculator"
      subtitle="Arithmetic sequences, geometric series, finite and infinite partial sums, Sigma (Σ) closed-form evaluations, and Binomial Theorem expansions with step derivations."
      category="Analysis & Sequences"
      icon={Sigma}
      color="#0284c7"
      badgeText="Standalone Calculator"
    >
      <SeriesTab />
    </StandaloneToolLayout>
  );
}
