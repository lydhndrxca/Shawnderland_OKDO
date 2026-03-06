"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import './GlossaryOverlay.css';

const GLOSSARY: Array<{ term: string; category: string; definition: string }> = [
  { term: 'Seed', category: 'Pipeline', definition: 'Your raw idea — the starting point. Enter any concept, problem, or inspiration.' },
  { term: 'Normalize', category: 'Pipeline', definition: 'Structures your seed into a summary, surfaces hidden assumptions, and generates clarifying questions.' },
  { term: 'Diverge', category: 'Pipeline', definition: 'Generates a portfolio of candidate ideas using multiple creative lenses.' },
  { term: 'Critique / Salvage', category: 'Pipeline', definition: 'Evaluates candidates for genericness, then mutates the weakest ones into stronger variants.' },
  { term: 'Expand', category: 'Pipeline', definition: 'Develops shortlisted candidates into detailed concept write-ups with sections and narratives.' },
  { term: 'Converge', category: 'Pipeline', definition: 'Scores and ranks all candidates to surface a winner based on novelty, usefulness, feasibility, differentiation, and energy.' },
  { term: 'Commit', category: 'Pipeline', definition: 'Finalizes the winning idea into a structured artifact with title, differentiator, and next actions.' },
  { term: 'Iterate', category: 'Pipeline', definition: 'Suggests follow-up prompts to start the next iteration cycle on the committed idea.' },
  { term: 'Practical', category: 'Lens', definition: 'Straightforward, implementable ideas that directly address the seed problem.' },
  { term: 'Inversion', category: 'Lens', definition: 'Contrarian ideas that flip assumptions or approach the problem from an opposite angle.' },
  { term: 'Constraint Art', category: 'Lens', definition: 'Ideas born from deliberately adding unusual constraints to force creative solutions.' },
  { term: 'Genericness', category: 'Critique', definition: 'A 1-10 score of how generic/obvious an idea is. Higher = more generic = candidate for mutation.' },
  { term: 'Mutation', category: 'Critique', definition: 'A transformed version of a generic candidate, produced using creative operators like SCAMPER.' },
  { term: 'SCAMPER', category: 'Critique', definition: 'Substitute, Combine, Adapt, Modify, Put to other use, Eliminate, Reverse — a classic creativity technique.' },
  { term: 'Design Heuristic', category: 'Critique', definition: 'A proven design principle applied as a mutation operator to improve weak candidates.' },
  { term: 'LLM Local', category: 'Critique', definition: 'A mutation operator that uses language-model reasoning to locally transform a candidate.' },
  { term: 'Novelty', category: 'Scoring', definition: 'How original or surprising the idea is (1-10).' },
  { term: 'Usefulness', category: 'Scoring', definition: 'How practically valuable the idea is to the target audience (1-10).' },
  { term: 'Feasibility', category: 'Scoring', definition: 'How realistic the idea is to build or implement (1-10).' },
  { term: 'Differentiation', category: 'Scoring', definition: 'How distinct the idea is from existing solutions (1-10).' },
  { term: 'Energy', category: 'Scoring', definition: 'How exciting or energizing the idea feels — a gut-check score (1-10).' },
];

export const TOOLTIP_MAP: Record<string, string> = {};
for (const g of GLOSSARY) {
  TOOLTIP_MAP[g.term.toLowerCase()] = g.definition;
}

interface GlossaryOverlayProps {
  onClose: () => void;
}

export default function GlossaryOverlay({ onClose }: GlossaryOverlayProps) {
  const [pos, setPos] = useState({ x: 60, y: 60 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.glossary-close')) return;
    setDragging(true);
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  }, [pos]);

  useEffect(() => {
    if (!dragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    };
    const handleMouseUp = () => setDragging(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging]);

  const categories = Array.from(new Set(GLOSSARY.map((g) => g.category)));

  return (
    <div
      ref={ref}
      className="glossary-overlay"
      style={{ left: pos.x, top: pos.y }}
      onMouseDown={handleMouseDown}
    >
      <div className="glossary-header">
        <span className="glossary-title">Terminology Guide</span>
        <button className="glossary-close" onClick={onClose} title="Close glossary">&times;</button>
      </div>
      <div className="glossary-body nowheel">
        {categories.map((cat) => (
          <div key={cat} className="glossary-section">
            <div className="glossary-section-title">{cat}</div>
            {GLOSSARY.filter((g) => g.category === cat).map((g) => (
              <div key={g.term} className="glossary-item">
                <span className="glossary-term">{g.term}</span>
                <span className="glossary-def">{g.definition}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
