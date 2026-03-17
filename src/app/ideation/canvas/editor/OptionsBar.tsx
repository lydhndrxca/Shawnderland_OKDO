"use client";

import { useCallback, useState } from 'react';
import { useEditor } from './EditorContext';
import { TOOL_LABELS } from './types';
import { useSmartSelect } from './tools/useSmartSelect';
import { useOutpaint, type OutpaintDirection } from './tools/useOutpaint';
import { useBgRemove } from './tools/useBgRemove';
import { useStyleTransfer, STYLE_PRESETS } from './tools/useStyleTransfer';
import { useSmartErase } from './tools/useSmartErase';
import { useEyedropper } from './tools/useEyedropper';
import type { GeminiImageModel } from './types';

export default function OptionsBar() {
  const ctx = useEditor();
  const [editText, setEditText] = useState('');
  const [ssText, setSsText] = useState('');
  const [outpaintDir, setOutpaintDir] = useState<OutpaintDirection>('all');
  const [outpaintPx, setOutpaintPx] = useState(256);
  const [outpaintPrompt, setOutpaintPrompt] = useState('');
  const [bgPrompt, setBgPrompt] = useState('');
  const [styleId, setStyleId] = useState('oil_painting');
  const [customStyle, setCustomStyle] = useState('');

  const smartSelect = useSmartSelect(ctx.maskCanvasRef, ctx.activeImage);
  const outpaintTool = useOutpaint();
  const bgRemove = useBgRemove();
  const styleTool = useStyleTransfer();
  const smartErase = useSmartErase();
  const eyedropper = useEyedropper();

  const handleSubmit = useCallback(async () => {
    if (!editText.trim() || ctx.editBusy) return;
    await ctx.handlePromptEdit(editText);
    setEditText('');
  }, [editText, ctx]);

  const handleSmartSelect = useCallback(async () => {
    if (!ssText.trim()) return;
    await smartSelect.selectSubject(ssText);
    setSsText('');
  }, [ssText, smartSelect]);

  const handleOutpaint = useCallback(async () => {
    if (!ctx.activeImage || outpaintTool.busy) return;
    const result = await outpaintTool.outpaint(ctx.activeImage, outpaintDir, outpaintPx, outpaintPrompt, ctx.editModel);
    if (result) {
      ctx.pushHistory(ctx.activeImage, `Outpaint ${outpaintDir}`);
      ctx.handlePasteImage(result);
      setOutpaintPrompt('');
    }
  }, [ctx, outpaintDir, outpaintPx, outpaintPrompt, outpaintTool]);

  const handleBgRemove = useCallback(async () => {
    if (!ctx.activeImage || bgRemove.busy) return;
    const result = await bgRemove.removeBg(ctx.activeImage, bgPrompt, ctx.editModel);
    if (result) {
      ctx.pushHistory(ctx.activeImage, 'BG Remove');
      ctx.handlePasteImage(result);
      setBgPrompt('');
    }
  }, [ctx, bgPrompt, bgRemove]);

  const handleStyleTransfer = useCallback(async () => {
    if (!ctx.activeImage || styleTool.busy) return;
    const preset = STYLE_PRESETS.find((p) => p.id === styleId);
    const prompt = styleId === 'custom' ? customStyle : preset?.prompt ?? '';
    if (!prompt.trim()) return;
    const result = await styleTool.transfer(ctx.activeImage, prompt, ctx.editModel);
    if (result) {
      ctx.pushHistory(ctx.activeImage, `Style: ${preset?.label ?? 'custom'}`);
      ctx.handlePasteImage(result);
    }
  }, [ctx, styleId, customStyle, styleTool]);

  const handleSmartErase = useCallback(async () => {
    if (!ctx.activeImage || smartErase.busy || !ctx.maskCanvasRef.current) return;
    const result = await smartErase.erase(ctx.activeImage, ctx.maskCanvasRef.current, ctx.editModel);
    if (result) {
      ctx.pushHistory(ctx.activeImage, 'Smart Erase');
      ctx.handlePasteImage(result);
    }
  }, [ctx, smartErase]);

  const isBrushTool = ctx.activeTool === 'brush' || ctx.activeTool === 'eraser';
  const showGenericPrompt = ctx.activeTool === 'aiEdit' || ctx.activeTool === 'move' || ctx.activeTool === 'hand';

  return (
    <div className="ps-optionsbar">
      <span className="ps-opt-tool-name">{TOOL_LABELS[ctx.activeTool]}</span>
      <div className="ps-opt-divider" />

      {/* ── Brush / Eraser ── */}
      {isBrushTool && (
        <>
          <label className="ps-opt-label">Size</label>
          <input type="range" className="ps-opt-range" min={3} max={200}
            value={ctx.brushSize} onChange={(e) => ctx.setBrushSize(Number(e.target.value))} />
          <span className="ps-opt-value">{ctx.brushSize}px</span>
          <div className="ps-opt-divider" />
          <input className="ps-opt-prompt" type="text" value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            placeholder={ctx.maskHasContent() ? 'Describe replacement for masked area...' : 'Paint mask, then describe edit...'}
            disabled={ctx.editBusy || !ctx.activeImage} />
          <button className="ps-opt-apply" onClick={handleSubmit}
            disabled={ctx.editBusy || !editText.trim() || !ctx.activeImage}>
            {ctx.editBusy ? `${ctx.editElapsed}s` : 'Apply'}
          </button>
        </>
      )}

      {/* ── Outpaint ── */}
      {ctx.activeTool === 'outpaint' && (
        <>
          <label className="ps-opt-label">Direction</label>
          <select className="ps-opt-model" value={outpaintDir}
            onChange={(e) => setOutpaintDir(e.target.value as OutpaintDirection)} disabled={outpaintTool.busy}>
            <option value="all">All Sides</option>
            <option value="left">Left</option>
            <option value="right">Right</option>
            <option value="top">Top</option>
            <option value="bottom">Bottom</option>
          </select>
          <label className="ps-opt-label">Px</label>
          <input type="range" className="ps-opt-range" min={64} max={512} step={64}
            value={outpaintPx} onChange={(e) => setOutpaintPx(Number(e.target.value))} />
          <span className="ps-opt-value">{outpaintPx}</span>
          <input className="ps-opt-prompt" type="text" value={outpaintPrompt}
            onChange={(e) => setOutpaintPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleOutpaint(); }}
            placeholder="Optional context for outpaint..."
            disabled={outpaintTool.busy || !ctx.activeImage} />
          <button className="ps-opt-apply" onClick={handleOutpaint}
            disabled={outpaintTool.busy || !ctx.activeImage}>
            {outpaintTool.busy ? 'Extending...' : 'Extend'}
          </button>
          {outpaintTool.error && <span className="ps-opt-error">{outpaintTool.error}</span>}
        </>
      )}

      {/* ── Smart Select ── */}
      {ctx.activeTool === 'smartSelect' && (
        <>
          <input className="ps-opt-prompt" type="text" value={ssText}
            onChange={(e) => setSsText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSmartSelect(); }}
            placeholder="Type subject to select (e.g. car, person, sky)..."
            disabled={smartSelect.busy || !ctx.activeImage} />
          <button className="ps-opt-apply" onClick={handleSmartSelect}
            disabled={smartSelect.busy || !ssText.trim() || !ctx.activeImage}>
            {smartSelect.busy ? 'Selecting...' : 'Select'}
          </button>
          {smartSelect.error && <span className="ps-opt-error">{smartSelect.error}</span>}
        </>
      )}

      {/* ── Background Remove ── */}
      {ctx.activeTool === 'bgRemove' && (
        <>
          <input className="ps-opt-prompt" type="text" value={bgPrompt}
            onChange={(e) => setBgPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleBgRemove(); }}
            placeholder="Optional: replacement background (e.g. sunset beach)..."
            disabled={bgRemove.busy || !ctx.activeImage} />
          <button className="ps-opt-apply" onClick={handleBgRemove}
            disabled={bgRemove.busy || !ctx.activeImage}>
            {bgRemove.busy ? 'Removing...' : 'Remove BG'}
          </button>
          {bgRemove.error && <span className="ps-opt-error">{bgRemove.error}</span>}
        </>
      )}

      {/* ── Style Transfer ── */}
      {ctx.activeTool === 'styleTransfer' && (
        <>
          <select className="ps-opt-model" value={styleId} onChange={(e) => setStyleId(e.target.value)}
            disabled={styleTool.busy}>
            {STYLE_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
          {styleId === 'custom' && (
            <input className="ps-opt-prompt" type="text" value={customStyle}
              onChange={(e) => setCustomStyle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleStyleTransfer(); }}
              placeholder="Describe the target style..."
              disabled={styleTool.busy} />
          )}
          <button className="ps-opt-apply" onClick={handleStyleTransfer}
            disabled={styleTool.busy || !ctx.activeImage || (styleId === 'custom' && !customStyle.trim())}>
            {styleTool.busy ? 'Transferring...' : 'Apply Style'}
          </button>
          {styleTool.error && <span className="ps-opt-error">{styleTool.error}</span>}
        </>
      )}

      {/* ── Smart Erase ── */}
      {ctx.activeTool === 'smartErase' && (
        <>
          <label className="ps-opt-label">Size</label>
          <input type="range" className="ps-opt-range" min={3} max={200}
            value={ctx.brushSize} onChange={(e) => ctx.setBrushSize(Number(e.target.value))} />
          <span className="ps-opt-value">{ctx.brushSize}px</span>
          <div className="ps-opt-divider" />
          <span className="ps-opt-label">Paint over object to remove, then:</span>
          <button className="ps-opt-apply" onClick={handleSmartErase}
            disabled={smartErase.busy || !ctx.activeImage}>
            {smartErase.busy ? 'Erasing...' : 'Erase Object'}
          </button>
          {smartErase.error && <span className="ps-opt-error">{smartErase.error}</span>}
        </>
      )}

      {/* ── Eyedropper ── */}
      {ctx.activeTool === 'eyedropper' && eyedropper.pickedColor && (
        <>
          <div style={{ width: 20, height: 20, background: eyedropper.pickedColor, borderRadius: 3, border: '1px solid #555', flexShrink: 0 }} />
          <span className="ps-opt-value" style={{ fontFamily: 'monospace' }}>{eyedropper.pickedColor}</span>
          <span className="ps-opt-label">(copied to clipboard)</span>
        </>
      )}

      {/* ── Generic AI Edit ── */}
      {showGenericPrompt && (
        <>
          <input className="ps-opt-prompt" type="text" value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            placeholder={ctx.maskHasContent() ? 'Describe replacement for masked area...' : 'Describe edit (e.g. add hat, change background)...'}
            disabled={ctx.editBusy || !ctx.activeImage} />
          <button className="ps-opt-apply" onClick={handleSubmit}
            disabled={ctx.editBusy || !editText.trim() || !ctx.activeImage}>
            {ctx.editBusy ? `${ctx.editElapsed}s` : 'Apply'}
          </button>
        </>
      )}

      {/* ── Crop hint ── */}
      {ctx.activeTool === 'crop' && (
        <span className="ps-opt-label">Click and drag on the canvas to define a crop region</span>
      )}

      {/* ── Model selector + spacer + status ── */}
      <div style={{ flex: 1 }} />

      <select className="ps-opt-model" value={ctx.editModel}
        onChange={(e) => ctx.setEditModel(e.target.value as GeminiImageModel)} disabled={ctx.editBusy}>
        <option value="gemini-flash-image">NB2 (Flash)</option>
        <option value="gemini-3-pro">NB Pro</option>
        <option value="gemini-2.5-flash">2.5 Flash</option>
      </select>

      {ctx.editStatus && (
        <span className="ps-opt-status">
          {ctx.editBusy && <span className="ps-spinner" />}
          {ctx.editStatus}
        </span>
      )}
      {ctx.editError && <span className="ps-opt-error">{ctx.editError}</span>}
    </div>
  );
}
