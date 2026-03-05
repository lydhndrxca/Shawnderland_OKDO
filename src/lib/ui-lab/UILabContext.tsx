"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useReducer,
  type ReactNode,
} from "react";
import type {
  AspectRatio,
  GenerationMode,
  SlotImage,
  UILabTab,
} from "./types";

/* ────────────────── state shape ────────────────── */

export interface UILabState {
  activeTab: UILabTab;
  prompt: string;
  mode: GenerationMode;
  aspectRatio: AspectRatio;
  customWidth: number;
  customHeight: number;
  styleText: string;
  styleGuidance: string;
  batchCount: number;

  styleSlot: SlotImage | null;
  refA: SlotImage | null;
  refB: SlotImage | null;
  refC: SlotImage | null;

  generatedImages: string[];
  currentVariantIndex: number;

  isGenerating: boolean;
  isExtracting: boolean;
  error: string | null;

  extractedAttributes: string | null;
  extractedSpec: Record<string, unknown> | null;
  removedUIImage: string | null;

  serviceOnline: boolean;
}

const initialState: UILabState = {
  activeTab: "generate",
  prompt: "",
  mode: "FREEFORM",
  aspectRatio: "1:1",
  customWidth: 512,
  customHeight: 512,
  styleText: "",
  styleGuidance: "",
  batchCount: 1,
  styleSlot: null,
  refA: null,
  refB: null,
  refC: null,
  generatedImages: [],
  currentVariantIndex: 0,
  isGenerating: false,
  isExtracting: false,
  error: null,
  extractedAttributes: null,
  extractedSpec: null,
  removedUIImage: null,
  serviceOnline: false,
};

/* ────────────────── actions ────────────────── */

type Action =
  | { type: "SET_TAB"; tab: UILabTab }
  | { type: "SET_PROMPT"; value: string }
  | { type: "SET_MODE"; value: GenerationMode }
  | { type: "SET_ASPECT_RATIO"; value: AspectRatio }
  | { type: "SET_DIMENSIONS"; w: number; h: number }
  | { type: "SET_STYLE_TEXT"; value: string }
  | { type: "SET_STYLE_GUIDANCE"; value: string }
  | { type: "SET_BATCH_COUNT"; value: number }
  | { type: "SET_SLOT"; slot: "styleSlot" | "refA" | "refB" | "refC"; image: SlotImage | null }
  | { type: "ADD_GENERATED_IMAGE"; image: string }
  | { type: "CLEAR_GENERATED_IMAGES" }
  | { type: "SET_VARIANT_INDEX"; index: number }
  | { type: "SET_GENERATING"; value: boolean }
  | { type: "SET_EXTRACTING"; value: boolean }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "SET_EXTRACTED_ATTRIBUTES"; value: string | null }
  | { type: "SET_EXTRACTED_SPEC"; value: Record<string, unknown> | null }
  | { type: "SET_REMOVED_UI_IMAGE"; value: string | null }
  | { type: "SET_SERVICE_ONLINE"; value: boolean };

function reducer(state: UILabState, action: Action): UILabState {
  switch (action.type) {
    case "SET_TAB":
      return { ...state, activeTab: action.tab, error: null };
    case "SET_PROMPT":
      return { ...state, prompt: action.value };
    case "SET_MODE":
      return { ...state, mode: action.value };
    case "SET_ASPECT_RATIO":
      return { ...state, aspectRatio: action.value };
    case "SET_DIMENSIONS":
      return { ...state, customWidth: action.w, customHeight: action.h };
    case "SET_STYLE_TEXT":
      return { ...state, styleText: action.value };
    case "SET_STYLE_GUIDANCE":
      return { ...state, styleGuidance: action.value };
    case "SET_BATCH_COUNT":
      return { ...state, batchCount: action.value };
    case "SET_SLOT":
      return { ...state, [action.slot]: action.image };
    case "ADD_GENERATED_IMAGE":
      return {
        ...state,
        generatedImages: [...state.generatedImages, action.image],
        currentVariantIndex: state.generatedImages.length,
      };
    case "CLEAR_GENERATED_IMAGES":
      return { ...state, generatedImages: [], currentVariantIndex: 0 };
    case "SET_VARIANT_INDEX":
      return { ...state, currentVariantIndex: action.index };
    case "SET_GENERATING":
      return { ...state, isGenerating: action.value, error: action.value ? null : state.error };
    case "SET_EXTRACTING":
      return { ...state, isExtracting: action.value, error: action.value ? null : state.error };
    case "SET_ERROR":
      return { ...state, error: action.error };
    case "SET_EXTRACTED_ATTRIBUTES":
      return { ...state, extractedAttributes: action.value };
    case "SET_EXTRACTED_SPEC":
      return { ...state, extractedSpec: action.value };
    case "SET_REMOVED_UI_IMAGE":
      return { ...state, removedUIImage: action.value };
    case "SET_SERVICE_ONLINE":
      return { ...state, serviceOnline: action.value };
    default:
      return state;
  }
}

/* ────────────────── context ────────────────── */

interface UILabContextValue {
  state: UILabState;
  dispatch: React.Dispatch<Action>;
  currentImage: string | null;
}

const UILabContext = createContext<UILabContextValue | null>(null);

export function UILabProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const currentImage =
    state.generatedImages.length > 0
      ? state.generatedImages[state.currentVariantIndex] ?? null
      : null;

  return (
    <UILabContext.Provider value={{ state, dispatch, currentImage }}>
      {children}
    </UILabContext.Provider>
  );
}

export function useUILab() {
  const ctx = useContext(UILabContext);
  if (!ctx) throw new Error("useUILab must be used within UILabProvider");
  return ctx;
}

export function useUILabActions() {
  const { dispatch } = useUILab();

  return {
    setTab: useCallback((tab: UILabTab) => dispatch({ type: "SET_TAB", tab }), [dispatch]),
    setPrompt: useCallback((value: string) => dispatch({ type: "SET_PROMPT", value }), [dispatch]),
    setMode: useCallback((value: GenerationMode) => dispatch({ type: "SET_MODE", value }), [dispatch]),
    setAspectRatio: useCallback((value: AspectRatio) => dispatch({ type: "SET_ASPECT_RATIO", value }), [dispatch]),
    setDimensions: useCallback((w: number, h: number) => dispatch({ type: "SET_DIMENSIONS", w, h }), [dispatch]),
    setStyleText: useCallback((value: string) => dispatch({ type: "SET_STYLE_TEXT", value }), [dispatch]),
    setStyleGuidance: useCallback((value: string) => dispatch({ type: "SET_STYLE_GUIDANCE", value }), [dispatch]),
    setBatchCount: useCallback((value: number) => dispatch({ type: "SET_BATCH_COUNT", value }), [dispatch]),
    setSlot: useCallback(
      (slot: "styleSlot" | "refA" | "refB" | "refC", image: SlotImage | null) =>
        dispatch({ type: "SET_SLOT", slot, image }),
      [dispatch],
    ),
    addGeneratedImage: useCallback((image: string) => dispatch({ type: "ADD_GENERATED_IMAGE", image }), [dispatch]),
    clearGeneratedImages: useCallback(() => dispatch({ type: "CLEAR_GENERATED_IMAGES" }), [dispatch]),
    setVariantIndex: useCallback((index: number) => dispatch({ type: "SET_VARIANT_INDEX", index }), [dispatch]),
    setGenerating: useCallback((value: boolean) => dispatch({ type: "SET_GENERATING", value }), [dispatch]),
    setExtracting: useCallback((value: boolean) => dispatch({ type: "SET_EXTRACTING", value }), [dispatch]),
    setError: useCallback((error: string | null) => dispatch({ type: "SET_ERROR", error }), [dispatch]),
    setExtractedAttributes: useCallback(
      (value: string | null) => dispatch({ type: "SET_EXTRACTED_ATTRIBUTES", value }),
      [dispatch],
    ),
    setExtractedSpec: useCallback(
      (value: Record<string, unknown> | null) => dispatch({ type: "SET_EXTRACTED_SPEC", value }),
      [dispatch],
    ),
    setRemovedUIImage: useCallback(
      (value: string | null) => dispatch({ type: "SET_REMOVED_UI_IMAGE", value }),
      [dispatch],
    ),
    setServiceOnline: useCallback(
      (value: boolean) => dispatch({ type: "SET_SERVICE_ONLINE", value }),
      [dispatch],
    ),
  };
}
