"use client";

import { useState } from 'react';
import { useSession } from '@/lib/ideation/context/SessionContext';
import { computeMetrics, type EvalMetrics } from '@/lib/ideation/engine/eval/metrics';
import { GOLDEN_SEEDS } from '@/lib/ideation/engine/eval/goldenSeeds';
import { runEvalSuite, type EvalSuiteResult } from '@/lib/ideation/engine/eval/runner';
import { checkRegression, DEFAULT_THRESHOLDS, type RegressionResult } from '@/lib/ideation/engine/eval/regression';
import { getEvalRuns, getLastSmokeResult } from '@/lib/ideation/state/sessionSelectors';
import { runSmoke, type SmokeResult } from '@/lib/ideation/engine/eval/smoke';
import './EvaluationDashboardView.css';

export default function EvaluationDashboardView() {
  const { session, recordEvalRun, recordEvalMetrics, recordSmokeRun, recordSmokeResult } = useSession();
  const [running, setRunning] = useState(false);
  const [smokeRunning, setSmokeRunning] = useState<'mock' | 'gemini' | null>(null);
  const [suiteResult, setSuiteResult] = useState<EvalSuiteResult | null>(null);
  const [regressionResults, setRegressionResults] = useState<RegressionResult[]>([]);
  const [smokeResult, setSmokeResult] = useState<SmokeResult | null>(null);

  const currentMetrics = computeMetrics(session);
  const evalRuns = getEvalRuns(session);
  const lastSmoke = getLastSmokeResult(session);

  const handleRunGolden = async () => {
    setRunning(true);
    try {
      const result = await runEvalSuite(GOLDEN_SEEDS);
      setSuiteResult(result);

      const regressions: RegressionResult[] = [];
      for (const r of result.results) {
        regressions.push(checkRegression(r.seedId, r.metrics));
      }
      setRegressionResults(regressions);

      const allPassed = regressions.every((r) => r.passed);
      const summary = `${result.totalPassed} passed, ${result.totalFailed} errors, ${regressions.filter((r) => !r.passed).length} regressions`;
      recordEvalRun('golden', allPassed, summary);

      recordEvalMetrics({
        ...currentMetrics,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setRunning(false);
    }
  };

  const handleRunSmoke = async (mode: 'mock' | 'gemini') => {
    if (mode === 'gemini') return;
    setSmokeRunning(mode);
    setSmokeResult(null);
    try {
      const result = await runSmoke({ providerMode: mode });
      setSmokeResult(result);
      recordSmokeRun(mode, result.ok, result.failures.length);
      recordSmokeResult(mode, result.ok, result.failures, result.timings);
    } finally {
      setSmokeRunning(null);
    }
  };

  const displayedSmoke = smokeResult ?? (lastSmoke ? {
    ok: lastSmoke.ok,
    failures: lastSmoke.failures,
    timings: lastSmoke.timings,
  } : null);

  return (
    <div className="eval-view">
      <div className="eval-toolbar">
        <h3>Evaluation Dashboard</h3>
        <button
          className="action-btn"
          onClick={handleRunGolden}
          disabled={running}
        >
          {running ? 'Running…' : `Run Golden Suite (${GOLDEN_SEEDS.length} seeds)`}
        </button>
      </div>

      <div className="eval-smoke-section">
        <h4>Runtime Verification (Smoke Test)</h4>
        <div className="eval-smoke-buttons">
          <button
            className="action-btn"
            onClick={() => handleRunSmoke('mock')}
            disabled={smokeRunning !== null}
          >
            {smokeRunning === 'mock' ? 'Running…' : 'Run Smoke (Mock)'}
          </button>
          <button
            className="action-btn smoke-gemini-btn"
            disabled
            title="Gemini smoke requires GEMINI_API_KEY env var set before app launch. Not available in renderer."
          >
            Run Smoke (Gemini)
          </button>
          <span className="eval-smoke-hint">
            Gemini smoke test requires GEMINI_API_KEY environment variable. Set it before launching the app, then use the CLI: <code>npm run smoke -- --gemini</code>
          </span>
        </div>

        {displayedSmoke && (
          <div className={`eval-smoke-result ${displayedSmoke.ok ? 'smoke-pass' : 'smoke-fail'}`}>
            <div className="smoke-status">
              <span className={`eval-badge ${displayedSmoke.ok ? 'pass' : 'fail'}`}>
                {displayedSmoke.ok ? 'PASS' : 'FAIL'}
              </span>
              <span className="smoke-summary">
                {displayedSmoke.failures.length === 0
                  ? 'All stages passed'
                  : `${displayedSmoke.failures.length} failure${displayedSmoke.failures.length !== 1 ? 's' : ''}`}
              </span>
            </div>

            {displayedSmoke.failures.length > 0 && (
              <div className="smoke-failures">
                {displayedSmoke.failures.map((f, i) => (
                  <div key={i} className="smoke-failure-item">
                    <span className="smoke-failure-step">{f.step}</span>
                    <span className="smoke-failure-error">{f.error}</span>
                  </div>
                ))}
              </div>
            )}

            {Object.keys(displayedSmoke.timings).length > 0 && (
              <div className="smoke-timings">
                {Object.entries(displayedSmoke.timings).map(([stage, ms]) => (
                  <span key={stage} className="smoke-timing">
                    {stage}: {ms}ms
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="eval-current">
        <h4>Current Session Metrics</h4>
        <MetricsTable metrics={currentMetrics} />
      </div>

      {suiteResult && (
        <div className="eval-suite-results">
          <h4>
            Golden Suite Results — {suiteResult.totalPassed} passed,{' '}
            {suiteResult.totalFailed} errors
          </h4>
          <table className="eval-table">
            <thead>
              <tr>
                <th>Seed</th>
                <th>Stages</th>
                <th>Diversity</th>
                <th>Generic%</th>
                <th>Buckets</th>
                <th>Regression</th>
              </tr>
            </thead>
            <tbody>
              {suiteResult.results.map((r, i) => {
                const reg = regressionResults[i];
                return (
                  <tr key={r.seedId} className={reg && !reg.passed ? 'eval-fail-row' : ''}>
                    <td title={r.seedText}>
                      {r.seedId}
                      {r.error && <span className="eval-error"> ERR</span>}
                    </td>
                    <td>{r.stagesCompleted.length}</td>
                    <td>{r.metrics.diversity.toFixed(3)}</td>
                    <td>{(r.metrics.genericnessRate * 100).toFixed(1)}%</td>
                    <td>{(r.metrics.bucketCoverage * 100).toFixed(0)}%</td>
                    <td>
                      {reg ? (
                        reg.passed ? (
                          <span className="eval-pass">PASS</span>
                        ) : (
                          <span className="eval-fail" title={reg.failures.join('; ')}>
                            FAIL ({reg.failures.length})
                          </span>
                        )
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {regressionResults.length > 0 && (
        <div className="eval-thresholds">
          <h4>Regression Thresholds</h4>
          <div className="eval-threshold-list">
            {Object.entries(DEFAULT_THRESHOLDS).map(([key, val]) => (
              <span key={key} className="eval-threshold">
                {key}: {val}
              </span>
            ))}
          </div>
        </div>
      )}

      {evalRuns.length > 0 && (
        <div className="eval-history">
          <h4>Run History</h4>
          <div className="eval-history-list">
            {evalRuns
              .slice(-10)
              .reverse()
              .map((r, i) => (
                <div key={i} className="eval-history-item">
                  <span className={`eval-badge ${r.pass ? 'pass' : 'fail'}`}>
                    {r.pass ? 'PASS' : 'FAIL'}
                  </span>
                  <span className="eval-history-mode">{r.mode}</span>
                  <span className="eval-history-summary">{r.summary}</span>
                  <span className="eval-history-time">
                    {new Date(r.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricsTable({ metrics }: { metrics: EvalMetrics }) {
  return (
    <table className="eval-metrics-table">
      <tbody>
        <tr>
          <td>Diversity</td>
          <td>{metrics.diversity.toFixed(3)}</td>
        </tr>
        <tr>
          <td>Genericness Rate</td>
          <td>{(metrics.genericnessRate * 100).toFixed(1)}%</td>
        </tr>
        <tr>
          <td>Salvage Apply Rate</td>
          <td>{(metrics.salvageApplyRate * 100).toFixed(1)}%</td>
        </tr>
        <tr>
          <td>Bucket Coverage</td>
          <td>{(metrics.bucketCoverage * 100).toFixed(0)}%</td>
        </tr>
        <tr>
          <td>Axes Uniqueness</td>
          <td>{metrics.axesUniqueness.toFixed(3)}</td>
        </tr>
        <tr>
          <td>Avg Similarity</td>
          <td>{metrics.avgSimilarity.toFixed(3)}</td>
        </tr>
        <tr>
          <td>Time to Decision</td>
          <td>
            {metrics.timeToDecisionMs !== null
              ? `${(metrics.timeToDecisionMs / 1000).toFixed(1)}s`
              : '—'}
          </td>
        </tr>
      </tbody>
    </table>
  );
}
