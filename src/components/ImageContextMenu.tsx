"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { getGlobalSettings } from '@/lib/globalSettings';
import './ImageContextMenu.css';

interface ImageData {
  base64: string;
  mimeType: string;
}

interface ImageContextMenuProps {
  image: ImageData;
  alt?: string;
  className?: string;
  children?: React.ReactNode;
  onPasteImage?: (img: ImageData) => void;
  onResetView?: () => void;
}

interface MenuPosition {
  x: number;
  y: number;
}

function dataUrlToBlob(base64: string, mimeType: string): Blob {
  const bytes = atob(base64);
  const buf = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
  return new Blob([buf], { type: mimeType });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ImageContextMenu({ image, alt, className, children, onPasteImage, onResetView }: ImageContextMenuProps) {
  const [menu, setMenu] = useState<MenuPosition | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY });
  }, []);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('contextmenu', close);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('contextmenu', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [menu]);

  const copyToClipboard = useCallback(async () => {
    setMenu(null);
    try {
      const blob = dataUrlToBlob(image.base64, 'image/png');
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      showToast('Copied to clipboard');
    } catch {
      showToast('Copy failed — browser may not support clipboard write');
    }
  }, [image, showToast]);

  const saveAsPng = useCallback(() => {
    setMenu(null);
    const blob = dataUrlToBlob(image.base64, 'image/png');
    downloadBlob(blob, `${alt || 'image'}.png`);
    showToast('Saved as PNG');
  }, [image, alt, showToast]);

  const saveAsJpeg = useCallback(() => {
    setMenu(null);
    const canvas = document.createElement('canvas');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            downloadBlob(blob, `${alt || 'image'}.jpg`);
            showToast('Saved as JPEG');
          }
        },
        'image/jpeg',
        0.92,
      );
    };
    img.src = `data:${image.mimeType};base64,${image.base64}`;
  }, [image, alt, showToast]);

  const saveToProject = useCallback(async () => {
    setMenu(null);
    const dir = getGlobalSettings().outputDir;
    if (!dir) {
      showToast('Set an output directory in Settings first');
      return;
    }
    try {
      const res = await fetch('/api/character-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64: image.base64,
          mimeType: image.mimeType,
          charName: alt || 'image',
          viewName: 'saved',
          outputDir: dir,
          appKey: 'generated-images',
        }),
      });
      if (res.ok) {
        showToast('Saved to project folder');
      } else {
        showToast('Save failed');
      }
    } catch {
      showToast('Save failed');
    }
  }, [image, alt, showToast]);

  const exportBase64 = useCallback(async () => {
    setMenu(null);
    try {
      await navigator.clipboard.writeText(image.base64);
      showToast('Base64 copied to clipboard');
    } catch {
      showToast('Failed to copy base64');
    }
  }, [image, showToast]);

  const openInNewTab = useCallback(() => {
    setMenu(null);
    const w = window.open();
    if (w) {
      w.document.write(`<img src="data:${image.mimeType};base64,${image.base64}" />`);
      w.document.title = alt || 'Generated Image';
    }
  }, [image, alt]);

  const pasteImage = useCallback(async () => {
    setMenu(null);
    if (!onPasteImage) return;
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imgType = item.types.find((t) => t.startsWith('image/'));
        if (imgType) {
          const blob = await item.getType(imgType);
          const reader = new FileReader();
          reader.onload = () => {
            const b64 = (reader.result as string).split(',')[1];
            onPasteImage({ base64: b64, mimeType: imgType });
            showToast('Image pasted');
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
      showToast('No image on clipboard');
    } catch {
      showToast('Paste failed — clipboard access denied');
    }
  }, [onPasteImage, showToast]);

  const resetView = useCallback(() => {
    setMenu(null);
    onResetView?.();
  }, [onResetView]);

  return (
    <div className={`icm-wrapper ${className ?? ''}`} onContextMenu={handleContextMenu}>
      {children ?? (
        <img
          src={`data:${image.mimeType};base64,${image.base64}`}
          alt={alt || 'Generated image'}
          className="icm-image"
        />
      )}

      {menu && (
        <div
          ref={menuRef}
          className="icm-menu"
          style={{ position: 'fixed', left: menu.x, top: menu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="icm-item" onClick={copyToClipboard}>
            <span className="icm-icon">📋</span> Copy to Clipboard
          </button>
          <button className="icm-item" onClick={saveAsPng}>
            <span className="icm-icon">💾</span> Save as PNG
          </button>
          <button className="icm-item" onClick={saveAsJpeg}>
            <span className="icm-icon">🖼</span> Save as JPEG
          </button>
          <button className="icm-item" onClick={saveToProject}>
            <span className="icm-icon">📁</span> Save to Project
          </button>
          <div className="icm-sep" />
          <button className="icm-item" onClick={exportBase64}>
            <span className="icm-icon">📄</span> Export Base64
          </button>
          <button className="icm-item" onClick={openInNewTab}>
            <span className="icm-icon">↗</span> Open in New Tab
          </button>
          {onPasteImage && (
            <>
              <div className="icm-sep" />
              <button className="icm-item" onClick={pasteImage}>
                <span className="icm-icon">📋</span> Paste Image
              </button>
            </>
          )}
          {onResetView && (
            <button className="icm-item" onClick={resetView}>
              <span className="icm-icon">🔄</span> Reset View
            </button>
          )}
        </div>
      )}

      {toast && <div className="icm-toast">{toast}</div>}
    </div>
  );
}
