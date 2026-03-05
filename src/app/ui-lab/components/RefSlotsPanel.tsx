"use client";

import { useUILab, useUILabActions } from "@/lib/ui-lab/UILabContext";
import ImageSlot from "./ImageSlot";
import type { SlotImage } from "@/lib/ui-lab/types";

export default function RefSlotsPanel() {
  const { state } = useUILab();
  const { setSlot } = useUILabActions();

  const handleSet = (
    slot: "styleSlot" | "refA" | "refB" | "refC",
    dataUrl: string,
    file: File,
  ) => {
    setSlot(slot, { dataUrl, file, name: file.name });
  };

  return (
    <div
      className="w-44 shrink-0 border-r overflow-y-auto p-3 space-y-4"
      style={{ borderColor: "var(--color-border)", background: "var(--color-panel)" }}
    >
      <h3
        className="text-[10px] font-bold uppercase tracking-widest"
        style={{ color: "var(--color-text-muted)" }}
      >
        Reference Images
      </h3>

      <ImageSlot
        label="Style"
        image={state.styleSlot?.dataUrl ?? null}
        onImageSet={(d, f) => handleSet("styleSlot", d, f)}
        onClear={() => setSlot("styleSlot", null)}
      />
      <ImageSlot
        label="Ref A"
        image={state.refA?.dataUrl ?? null}
        onImageSet={(d, f) => handleSet("refA", d, f)}
        onClear={() => setSlot("refA", null)}
      />
      <ImageSlot
        label="Ref B"
        image={state.refB?.dataUrl ?? null}
        onImageSet={(d, f) => handleSet("refB", d, f)}
        onClear={() => setSlot("refB", null)}
      />
      <ImageSlot
        label="Ref C"
        image={state.refC?.dataUrl ?? null}
        onImageSet={(d, f) => handleSet("refC", d, f)}
        onClear={() => setSlot("refC", null)}
      />
    </div>
  );
}
