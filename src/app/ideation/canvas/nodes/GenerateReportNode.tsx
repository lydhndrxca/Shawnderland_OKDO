"use client";

import { useCallback, useState, useRef } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import { useSession } from '@/lib/ideation/context/SessionContext';
import { STAGE_IDS, STAGE_LABELS, type StageId } from '@/lib/ideation/engine/stages';
import { createGeminiProvider } from '@/lib/ideation/engine/provider/geminiProvider';
import { z } from 'zod';
import './GenerateReportNode.css';

const ReportSchema = z.object({
  tldr: z.string(),
  sections: z.array(z.object({
    heading: z.string(),
    body: z.string(),
  })),
  conclusion: z.string(),
});
type ReportData = z.infer<typeof ReportSchema>;

function collectPipelineData(session: { stageState: Record<string, { output?: unknown }> }): string {
  const parts: string[] = [];
  for (const stageId of STAGE_IDS) {
    const output = session.stageState[stageId]?.output;
    if (!output) continue;
    parts.push(`## ${STAGE_LABELS[stageId]} Output\n\`\`\`json\n${JSON.stringify(output, null, 2)}\n\`\`\``);
  }
  return parts.join('\n\n');
}

function buildReportPrompt(pipelineData: string): string {
  return (
    '[TASK:generate-report]\n\n' +
    '## Role\n' +
    'You are a senior strategy consultant preparing an executive presentation.\n\n' +
    '## Pipeline Data\n' +
    'Below is the complete output from an ideation pipeline that took a seed idea through ' +
    'normalization, divergent brainstorming, critique, expansion, convergence scoring, and ' +
    'commitment. Analyze ALL of it.\n\n' +
    pipelineData + '\n\n' +
    '## Instructions\n' +
    'Generate a polished executive report structured as a presentation. The report must:\n\n' +
    '1. **tldr** — A punchy 2-3 sentence executive summary: what the idea is, why it matters, ' +
    'and the single most important takeaway. Write it so a busy exec can read just this and understand.\n\n' +
    '2. **sections** — An array of presentation sections, each with a `heading` and `body`. Include:\n' +
    '   - "The Seed" — What the original idea was and the context around it\n' +
    '   - "Key Assumptions" — What was assumed and what was validated\n' +
    '   - "The Brainstorm" — How many directions were explored, the most promising angles\n' +
    '   - "Critique & Refinement" — What survived scrutiny, what was improved\n' +
    '   - "Deep Dive" — The expanded analysis of top candidates: risks, scope, feasibility\n' +
    '   - "The Winner" — Which idea won, its scores, and why it beat the rest\n' +
    '   - "Action Plan" — Concrete next steps, first 60 minutes, week-1 milestones\n' +
    '   - "Risks & Mitigations" — What could go wrong and how to handle it\n' +
    '   Only include sections for stages that have data. Skip empty stages.\n' +
    '   Use markdown formatting in the body: bold, bullet lists, numbered lists.\n\n' +
    '3. **conclusion** — A forward-looking closing statement that ties everything together.\n\n' +
    'Return JSON: { "tldr": "...", "sections": [{ "heading": "...", "body": "..." }], "conclusion": "..." }\n'
  );
}

export default function GenerateReportNode({ selected }: NodeProps) {
  const { session } = useSession();
  const [report, setReport] = useState<ReportData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const reportRef = useRef<HTMLDivElement>(null);

  const stagesWithOutput = STAGE_IDS.filter(
    (id) => !!(session.stageState as Record<string, { output?: unknown }>)[id]?.output,
  );

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const pipelineData = collectPipelineData(
        session as unknown as { stageState: Record<string, { output?: unknown }> },
      );
      if (!pipelineData) {
        setError('No pipeline data — run at least one stage first.');
        return;
      }
      const prompt = buildReportPrompt(pipelineData);
      const provider = createGeminiProvider(undefined, 'standard');
      const raw = await provider.generateStructured({ schema: ReportSchema, prompt });
      setReport(raw);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }, [session]);

  const handleCopy = useCallback(() => {
    if (!report) return;
    let md = `# TLDR\n\n${report.tldr}\n\n---\n\n`;
    for (const s of report.sections) {
      md += `## ${s.heading}\n\n${s.body}\n\n`;
    }
    md += `---\n\n## Conclusion\n\n${report.conclusion}\n`;
    navigator.clipboard.writeText(md);
  }, [report]);

  const handleDownload = useCallback(() => {
    if (!report) return;
    let md = `# Ideation Report\n\n## TLDR\n\n${report.tldr}\n\n---\n\n`;
    for (const s of report.sections) {
      md += `## ${s.heading}\n\n${s.body}\n\n`;
    }
    md += `---\n\n## Conclusion\n\n${report.conclusion}\n`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ideation-report.md';
    a.click();
    URL.revokeObjectURL(url);
  }, [report]);

  return (
    <div className={`report-node ${selected ? 'selected' : ''} ${report ? 'has-report' : ''}`}>
      <Handle type="target" position={Position.Left} className="report-node-handle" />

      <div className="report-node-header">
        <span className="report-node-label">Generate Report</span>
        <span className="report-node-badge">{stagesWithOutput.length}/{STAGE_IDS.length} stages</span>
      </div>

      {!report && !generating && (
        <div className="report-node-empty">
          <div className="report-node-status">
            {stagesWithOutput.length === 0
              ? 'Run the pipeline first'
              : `${stagesWithOutput.map((s) => STAGE_LABELS[s as StageId]).join(', ')}`}
          </div>
          <button
            className="report-node-generate-btn nodrag"
            onClick={handleGenerate}
            disabled={stagesWithOutput.length === 0}
          >
            Generate Report
          </button>
        </div>
      )}

      {generating && (
        <div className="report-node-generating">
          <div className="report-node-spinner" />
          <span>Generating report...</span>
        </div>
      )}

      {error && (
        <div className="report-node-error">{error}</div>
      )}

      {report && !generating && (
        <div className="report-node-content nodrag nowheel" ref={reportRef}>
          <div className="report-section report-tldr" onClick={() => setExpanded(!expanded)}>
            <div className="report-section-heading report-tldr-heading">
              TLDR
              <span className="report-expand-hint">{expanded ? 'collapse' : 'expand'}</span>
            </div>
            <div className="report-tldr-text">{report.tldr}</div>
          </div>

          {expanded && (
            <>
              {report.sections.map((s, i) => (
                <div key={i} className="report-section">
                  <div className="report-section-heading">{s.heading}</div>
                  <div
                    className="report-section-body"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(s.body) }}
                  />
                </div>
              ))}

              <div className="report-section report-conclusion">
                <div className="report-section-heading">Conclusion</div>
                <div className="report-conclusion-text">{report.conclusion}</div>
              </div>
            </>
          )}

          <div className="report-node-actions nodrag">
            <button className="report-action-btn" onClick={handleCopy}>Copy</button>
            <button className="report-action-btn" onClick={handleDownload}>Download .md</button>
            <button className="report-action-btn report-regen-btn" onClick={handleGenerate}>Regenerate</button>
          </div>
        </div>
      )}
    </div>
  );
}

function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^[-•] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    .replace(/^\d+\.\s(.+)$/gm, '<li>$1</li>')
    .replace(/\n/g, '<br/>');
}
