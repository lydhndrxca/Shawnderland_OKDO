"use client";

import React from "react";
import type { ScoredConcept } from "../aiWriter";
import { Star, Zap, Eye, Timer, Trophy } from "lucide-react";

interface Props {
  concept: ScoredConcept;
  index: number;
  selected: boolean;
  onSelect: () => void;
}

function ScoreBar({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="aw-score-row">
      <span className="aw-score-icon">{icon}</span>
      <span className="aw-score-label">{label}</span>
      <div className="aw-score-bar">
        <div className="aw-score-fill" style={{ width: `${value * 10}%` }} />
      </div>
      <span className="aw-score-val">{value}</span>
    </div>
  );
}

export function ConceptCard({ concept, index, selected, onSelect }: Props) {
  return (
    <div
      className={`aw-concept-card ${selected ? "selected" : ""} ${concept.recommended ? "recommended" : ""}`}
      onClick={onSelect}
    >
      {concept.recommended && (
        <div className="aw-concept-badge">
          <Trophy size={10} /> AI Pick
        </div>
      )}
      <div className="aw-concept-header">
        <span className="aw-concept-num">{index + 1}</span>
        <h3 className="aw-concept-title">{concept.title}</h3>
      </div>
      <p className="aw-concept-logline">{concept.logline}</p>
      <div className="aw-concept-details">
        <div className="aw-concept-detail">
          <span className="aw-detail-label">Hook:</span> {concept.emotionalHook}
        </div>
        <div className="aw-concept-detail">
          <span className="aw-detail-label">Twist:</span> {concept.keyTwist}
        </div>
        <div className="aw-concept-detail">
          <span className="aw-detail-label">Visual:</span> {concept.visualStyle}
        </div>
      </div>
      {concept.score && (
        <div className="aw-concept-scores">
          <ScoreBar label="Hook" value={concept.score.hookStrength} icon={<Zap size={10} />} />
          <ScoreBar label="Emotion" value={concept.score.emotionalArc} icon={<Star size={10} />} />
          <ScoreBar label="Visual" value={concept.score.visualPotential} icon={<Eye size={10} />} />
          <ScoreBar label="Pacing" value={concept.score.pacing} icon={<Timer size={10} />} />
          <div className="aw-score-overall">
            Overall: <strong>{concept.score.overall}/10</strong>
          </div>
          {concept.score.notes && (
            <div className="aw-score-notes">{concept.score.notes}</div>
          )}
        </div>
      )}
    </div>
  );
}
