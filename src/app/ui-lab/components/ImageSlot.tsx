"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X, Clipboard, Image as ImageIcon } from "lucide-react";

interface ImageSlotProps {
  label: string;
  image: string | null;
  onImageSet: (dataUrl: string, file: File) => void;
  onClear: () => void;
  compact?: boolean;
  accept?: string;
}

export default function ImageSlot({
  label,
  image,
  onImageSet,
  onClear,
  compact = false,
  accept = "image/*",
}: ImageSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          onImageSet(reader.result, file);
        }
      };
      reader.readAsDataURL(file);
    },
    [onImageSet],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file?.type.startsWith("image/")) handleFile(file);
    },
    [handleFile],
  );

  const handlePaste = useCallback(async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imgType = item.types.find((t) => t.startsWith("image/"));
        if (imgType) {
          const blob = await item.getType(imgType);
          const file = new File([blob], "pasted.png", { type: imgType });
          handleFile(file);
          return;
        }
      }
    } catch {
      /* clipboard access denied */
    }
  }, [handleFile]);

  const slotSize = compact ? "h-16 w-16" : "h-24 w-full";
  const thumbSize = compact ? "h-14 w-14" : "h-20 w-full";

  return (
    <div className={compact ? "flex flex-col items-center gap-1" : "space-y-1"}>
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {label}
        </span>
        <div className="flex gap-0.5">
          <button
            onClick={handlePaste}
            className="p-0.5 rounded hover:bg-[var(--color-hover)] transition-colors"
            title="Paste from clipboard"
          >
            <Clipboard className="h-3 w-3" style={{ color: "var(--color-text-muted)" }} />
          </button>
          {image && (
            <button
              onClick={onClear}
              className="p-0.5 rounded hover:bg-[var(--color-hover)] transition-colors"
              title="Clear"
            >
              <X className="h-3 w-3" style={{ color: "var(--color-text-muted)" }} />
            </button>
          )}
        </div>
      </div>
      <div
        className={`relative ${slotSize} rounded-md border-2 overflow-hidden transition-colors cursor-pointer ${
          dragOver ? "border-[var(--color-accent)]" : "border-[var(--color-border)]"
        }`}
        style={{ background: "var(--color-elevated)" }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={label}
            className={`${thumbSize} object-contain`}
            draggable={false}
          />
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center gap-1">
            <ImageIcon className="h-4 w-4" style={{ color: "var(--color-text-muted)" }} />
            {!compact && (
              <span className="text-[9px]" style={{ color: "var(--color-text-muted)" }}>
                Drop or click
              </span>
            )}
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
