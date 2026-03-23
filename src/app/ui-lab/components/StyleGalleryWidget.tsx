"use client";

import { useCallback, useEffect, useState } from "react";
import { getStyleImages, listStyles } from "@/lib/ui-lab/api";
import { useUILab } from "@/lib/ui-lab/UILabContext";
import { FolderPlus, Trash2, Pencil, Plus, X } from "lucide-react";

interface FolderMeta {
  name: string;
  guidance: string;
  image_count: number;
}

interface ImageEntry {
  name: string;
  thumbnail: string;
}

export default function StyleGalleryWidget() {
  const { state } = useUILab();
  const [folders, setFolders] = useState<FolderMeta[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [guidance, setGuidance] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());

  const refreshFolders = useCallback(async () => {
    if (!state.serviceOnline) return;
    try {
      const res = await listStyles();
      setFolders(res.folders);
    } catch { /* offline */ }
  }, [state.serviceOnline]);

  useEffect(() => { refreshFolders(); }, [refreshFolders]);

  const loadFolderImages = useCallback(async (folder: string) => {
    setLoading(true);
    setSelectedImages(new Set());
    try {
      const res = await getStyleImages(folder);
      setImages(res.images);
      setGuidance(res.guidance);
    } catch {
      setImages([]);
      setGuidance("");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedFolder) loadFolderImages(selectedFolder);
    else { setImages([]); setGuidance(""); }
  }, [selectedFolder, loadFolderImages]);

  const toggleImage = (name: string) => {
    setSelectedImages((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div className="h-full flex" style={{ background: "var(--color-background)" }}>
      {/* ─── Folder list ─── */}
      <div
        className="w-56 shrink-0 flex flex-col border-r overflow-hidden"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
      >
        <div className="px-3 py-2 border-b flex items-center justify-between" style={{ borderColor: "var(--color-border)" }}>
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
            Style Folders
          </span>
          <div className="flex gap-1">
            <button
              title="New Folder"
              className="p-1 rounded hover:bg-[var(--color-hover)] transition-colors"
              style={{ color: "var(--color-text-primary)" }}
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </button>
            <button
              title="Delete Folder"
              className="p-1 rounded hover:bg-[var(--color-hover)] transition-colors"
              style={{ color: "var(--color-text-primary)" }}
              disabled={!selectedFolder}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <button
              title="Rename Folder"
              className="p-1 rounded hover:bg-[var(--color-hover)] transition-colors"
              style={{ color: "var(--color-text-primary)" }}
              disabled={!selectedFolder}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {folders.length === 0 && (
            <p className="px-3 py-4 text-[10px] text-center" style={{ color: "var(--color-text-muted)" }}>
              {state.serviceOnline ? "No style folders" : "Service offline"}
            </p>
          )}
          {folders.map((f) => (
            <button
              key={f.name}
              onClick={() => setSelectedFolder(f.name)}
              className={`w-full text-left px-3 py-2 text-xs transition-colors border-b ${
                selectedFolder === f.name
                  ? "bg-[var(--color-tool-ui)] text-white"
                  : "hover:bg-[var(--color-hover)]"
              }`}
              style={{
                borderColor: "var(--color-border)",
                color: selectedFolder === f.name ? "white" : "var(--color-text-primary)",
              }}
            >
              <div className="font-medium truncate">{f.name}</div>
              <div className="text-[10px] opacity-60">{f.image_count} images</div>
            </button>
          ))}
        </div>

        {/* Trained Elements placeholder */}
        <div className="border-t px-3 py-2" style={{ borderColor: "var(--color-border)" }}>
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
            Trained Elements
          </span>
          <p className="text-[9px] mt-1" style={{ color: "var(--color-text-muted)" }}>
            Subfolders for element-type-specific trained images
          </p>
        </div>
      </div>

      {/* ─── Images grid ─── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <div className="px-3 py-2 border-b flex items-center justify-between shrink-0" style={{ borderColor: "var(--color-border)" }}>
          <span className="text-xs font-medium" style={{ color: "var(--color-text-primary)" }}>
            {selectedFolder ? `Images in "${selectedFolder}"` : "Select a folder"}
          </span>
          <div className="flex items-center gap-2">
            {selectedFolder && (
              <>
                <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                  {images.length} images
                </span>
                <button
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors hover:bg-[var(--color-hover)]"
                  style={{ color: "var(--color-text-primary)", border: "1px solid var(--color-border)" }}
                >
                  <Plus className="h-3 w-3" /> Add Images
                </button>
                <button
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors hover:bg-[var(--color-hover)]"
                  style={{ color: "var(--color-text-primary)", border: "1px solid var(--color-border)" }}
                  disabled={selectedImages.size === 0}
                >
                  <X className="h-3 w-3" /> Remove Selected
                </button>
              </>
            )}
          </div>
        </div>

        {/* Image grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Loading...</span>
            </div>
          ) : !selectedFolder ? (
            <div className="flex items-center justify-center h-full">
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Select a style folder to view its images</span>
            </div>
          ) : images.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>No images in this folder</span>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2">
              {images.map((img) => {
                const isSelected = selectedImages.has(img.name);
                return (
                  <button
                    key={img.name}
                    onClick={() => toggleImage(img.name)}
                    className={`relative rounded-md overflow-hidden aspect-square transition-all ${
                      isSelected ? "ring-2 ring-[var(--color-tool-ui)]" : "ring-1"
                    }`}
                    style={{
                      background: "var(--color-elevated)",
                      outlineColor: isSelected ? undefined : "var(--color-border)",
                    }}
                  >
                    <img
                      src={`data:image/jpeg;base64,${img.thumbnail}`}
                      alt={img.name}
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                    <div
                      className="absolute bottom-0 left-0 right-0 px-1 py-0.5 text-[9px] truncate"
                      style={{ background: "rgba(0,0,0,0.7)", color: "white" }}
                    >
                      {img.name}
                    </div>
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[var(--color-tool-ui)] flex items-center justify-center">
                        <span className="text-white text-[8px]">✓</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Style Guidance */}
        {selectedFolder && (
          <div className="px-3 py-2 border-t shrink-0" style={{ borderColor: "var(--color-border)" }}>
            <label className="text-[10px] font-bold uppercase tracking-widest block mb-1" style={{ color: "var(--color-text-muted)" }}>
              Style Guidance
            </label>
            <textarea
              value={guidance}
              onChange={(e) => setGuidance(e.target.value)}
              placeholder="Describe the visual style this folder represents..."
              className="w-full rounded-md text-xs p-2 resize-none focus:outline-none"
              style={{
                height: 60,
                background: "var(--color-elevated)",
                color: "var(--color-text-primary)",
                border: "1px solid var(--color-border)",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
