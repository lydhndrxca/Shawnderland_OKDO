"use client";

import { useCallback, useEffect, useState } from 'react';
import { NODE_META, STAGE_ORDER } from './nodes/nodeRegistry';
import './DemoOverlay.css';

interface DemoStep {
  stageId: string;
  title: string;
  description: string;
  mockOutput: string;
}

const DEMO_STEPS: DemoStep[] = [
  {
    stageId: 'seed',
    title: '1. Seed Your Idea',
    description: 'Start by typing your raw idea. It can be rough, half-formed, or just a spark. This is the beginning of the journey.',
    mockOutput: '"A mobile app that helps people discover local street food vendors"',
  },
  {
    stageId: 'normalize',
    title: '2. Normalize & Analyze',
    description: 'Your idea gets structured into a formal analysis. Hidden assumptions are surfaced, and clarifying questions are generated.',
    mockOutput: 'Summary: "Location-based street food discovery platform"\n3 assumptions found, 4 clarifying questions generated',
  },
  {
    stageId: 'diverge',
    title: '3. Diverge into Candidates',
    description: 'Multiple creative approaches are generated across different lenses — practical solutions, inversions, and creative constraints.',
    mockOutput: '18 candidates generated:\n• 6 Practical approaches\n• 6 Inversion ideas\n• 6 Constraint-art concepts',
  },
  {
    stageId: 'critique-salvage',
    title: '4. Critique & Salvage',
    description: 'Each candidate is evaluated for genericness. Generic ideas get salvaged with creative mutations to make them sharper.',
    mockOutput: '18 critiques completed\n7 candidates flagged as generic\n5 salvage mutations proposed',
  },
  {
    stageId: 'expand',
    title: '5. Expand & Deep Dive',
    description: 'Shortlisted candidates get fleshed out with risk analysis, scope calibration, and day-one action plans.',
    mockOutput: '6 expansions with:\n• Risk/mitigation analysis\n• Scope tighten/loosen options\n• Day 1 and Week 1 plans',
  },
  {
    stageId: 'converge',
    title: '6. Converge & Score',
    description: 'All expanded ideas are scored on novelty, usefulness, feasibility, differentiation, and energy. A winner emerges.',
    mockOutput: 'Winner: "Vendor Stories" (Score: 87/100)\nRunner-up: "Flavor Routes" (Score: 82/100)',
  },
  {
    stageId: 'commit',
    title: '7. Commit to Artifact',
    description: 'Your winning idea becomes a concrete artifact — a pitch, a spec, or an action plan you can act on immediately.',
    mockOutput: 'Artifact: "Vendor Stories — Discovery Through Narrative"\nType: Product Pitch\n3 next actions generated',
  },
  {
    stageId: 'iterate',
    title: '8. Iterate & Explore',
    description: 'Get follow-up prompts and branching ideas. Start a new cycle, branch off in a different direction, or refine further.',
    mockOutput: '4 next-step suggestions:\n• Explore the vendor onboarding flow\n• Diverge on monetization models\n• What if it were audio-only?\n• Community governance angle',
  },
];

interface DemoOverlayProps {
  onDismiss: () => void;
}

export default function DemoOverlay({ onDismiss }: DemoOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [animating, setAnimating] = useState(false);

  const step = DEMO_STEPS[currentStep];
  const meta = NODE_META[step.stageId as keyof typeof NODE_META];
  const isLast = currentStep === DEMO_STEPS.length - 1;

  const goNext = useCallback(() => {
    if (isLast) { onDismiss(); return; }
    setAnimating(true);
    setTimeout(() => { setCurrentStep((p) => p + 1); setAnimating(false); }, 200);
  }, [isLast, onDismiss]);

  const goPrev = useCallback(() => {
    if (currentStep === 0) return;
    setAnimating(true);
    setTimeout(() => { setCurrentStep((p) => p - 1); setAnimating(false); }, 200);
  }, [currentStep]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onDismiss();
      if (e.key === 'ArrowRight' || e.key === ' ') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onDismiss, goNext, goPrev]);

  return (
    <div className="demo-overlay">
      <div className="demo-backdrop" onClick={onDismiss} />

      <div className={`demo-card ${animating ? 'animating' : ''}`}>
        <div className="demo-progress">
          {DEMO_STEPS.map((_, i) => (
            <div
              key={i}
              className={`demo-progress-dot ${i === currentStep ? 'active' : ''} ${i < currentStep ? 'done' : ''}`}
              style={{ background: i === currentStep ? NODE_META[DEMO_STEPS[i].stageId as keyof typeof NODE_META]?.color : undefined }}
            />
          ))}
        </div>

        <div className="demo-header" style={{ borderLeftColor: meta?.color }}>
          <span className="demo-step-dot" style={{ background: meta?.color }} />
          <h2 className="demo-title">{step.title}</h2>
        </div>

        <p className="demo-description">{step.description}</p>

        <div className="demo-mock-output">
          <div className="demo-mock-label">Example Output</div>
          <pre className="demo-mock-pre">{step.mockOutput}</pre>
        </div>

        <div className="demo-nav">
          <button className="demo-nav-btn" onClick={goPrev} disabled={currentStep === 0}>← Previous</button>
          <span className="demo-nav-counter">{currentStep + 1} / {DEMO_STEPS.length}</span>
          <button className="demo-nav-btn primary" onClick={goNext}>
            {isLast ? 'Try it yourself →' : 'Next →'}
          </button>
        </div>

        <button className="demo-dismiss" onClick={onDismiss}>Skip Tutorial</button>
      </div>
    </div>
  );
}
