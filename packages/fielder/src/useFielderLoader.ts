import { useState, useEffect, useRef } from "react";
import type { CorpusChunk } from "./corpus/types";
import type { DecisionEntry } from "./taxonomy/types";
import {
  loadCorpusData,
  loadDecisionData,
  isFielderDataLoaded,
  getCorpusSize,
  getDecisionCount,
} from "./retrieval/retrieve";

export interface FielderLoadState {
  loading: boolean;
  loaded: boolean;
  corpusSize: number;
  decisionCount: number;
  error: string | null;
}

const CORPUS_URL = "/api/fielder-corpus";

export function useFielderLoader(): FielderLoadState {
  const [state, setState] = useState<FielderLoadState>({
    loading: false,
    loaded: isFielderDataLoaded(),
    corpusSize: getCorpusSize(),
    decisionCount: getDecisionCount(),
    error: null,
  });
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current || isFielderDataLoaded()) {
      if (isFielderDataLoaded()) {
        setState({
          loading: false,
          loaded: true,
          corpusSize: getCorpusSize(),
          decisionCount: getDecisionCount(),
          error: null,
        });
      }
      return;
    }
    attempted.current = true;

    async function load() {
      setState((s) => ({ ...s, loading: true, error: null }));

      try {
        const statsRes = await fetch(`${CORPUS_URL}?type=stats`);
        const stats = await statsRes.json();

        if (!stats.loaded) {
          setState({
            loading: false,
            loaded: false,
            corpusSize: 0,
            decisionCount: 0,
            error: null,
          });
          return;
        }

        const [chunksRes, decisionsRes] = await Promise.all([
          fetch(`${CORPUS_URL}?type=chunks`),
          fetch(`${CORPUS_URL}?type=decisions`),
        ]);

        const chunksJson = await chunksRes.json();
        const decisionsJson = await decisionsRes.json();

        const chunks: CorpusChunk[] = chunksJson.data || [];
        const decisions: DecisionEntry[] = decisionsJson.data || [];

        if (chunks.length > 0) loadCorpusData(chunks);
        if (decisions.length > 0) loadDecisionData(decisions);

        setState({
          loading: false,
          loaded: true,
          corpusSize: getCorpusSize(),
          decisionCount: getDecisionCount(),
          error: null,
        });

        console.log(
          `[Fielder] Loaded ${chunks.length} corpus chunks, ${decisions.length} decisions`,
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load Fielder data";
        console.warn("[Fielder] Load error:", msg);
        setState({
          loading: false,
          loaded: false,
          corpusSize: 0,
          decisionCount: 0,
          error: msg,
        });
      }
    }

    load();
  }, []);

  return state;
}
