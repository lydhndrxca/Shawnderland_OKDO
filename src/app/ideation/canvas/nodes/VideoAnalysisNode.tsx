"use client";

import { memo, useCallback, useState, useRef, useEffect } from "react";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import { recordUsage } from "@/lib/ideation/engine/provider/costTracker";
import { getGlobalSettings } from "@/lib/globalSettings";
import "./VideoAnalysisNode.css";

interface VideoEntry {
  id: string;
  file: File;
  name: string;
  sizeMB: number;
  thumbnailUrl?: string;
}

interface AnalysisResult {
  videoId: string;
  videoName: string;
  text: string;
  error?: string;
}

interface VideoAnalysisNodeProps {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

const MAX_FILE_SIZE_MB = 500;
const SUPPORTED_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/mpeg",
  "video/3gpp",
]);

function generateVideoThumbnail(file: File): Promise<string | undefined> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    video.onloadeddata = () => {
      video.currentTime = Math.min(1, video.duration * 0.1);
    };

    video.onseeked = () => {
      canvas.width = 120;
      canvas.height =
        Math.round((120 / video.videoWidth) * video.videoHeight) || 68;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.6));
      } else {
        resolve(undefined);
      }
      URL.revokeObjectURL(video.src);
    };

    video.onerror = () => {
      resolve(undefined);
      URL.revokeObjectURL(video.src);
    };

    video.src = URL.createObjectURL(file);
  });
}

async function analyzeVideo(
  file: File,
  prompt: string,
  timeoutMs = 300_000,
): Promise<{ text: string; usage?: Record<string, number> }> {
  const form = new FormData();
  form.append("file", file);
  form.append(
    "prompt",
    `VIDEO FILE: "${file.name}" (${(file.size / 1024 / 1024).toFixed(1)}MB)\n\n` +
      `ANALYSIS INSTRUCTIONS:\n${prompt}\n\n` +
      `Provide a thorough, well-structured analysis.`,
  );

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {};
    const userKey = getGlobalSettings().geminiApiKey;
    if (userKey) headers["x-api-key"] = userKey;

    const res = await fetch("/api/video-analyze", {
      method: "POST",
      headers,
      body: form,
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
    }

    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

function VideoAnalysisNodeInner({ id, selected }: VideoAnalysisNodeProps) {
  const { setNodes } = useReactFlow();
  const [videos, setVideos] = useState<VideoEntry[]>([]);
  const [prompt, setPrompt] = useState(
    "Break down this video scene by scene. For each scene, describe:\n" +
      "- What is happening visually\n" +
      "- Camera movement and shot type\n" +
      "- Audio/music cues\n" +
      "- Mood and pacing\n" +
      "- Duration estimate",
  );
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState("");
  const [expandedResults, setExpandedResults] = useState<Set<string>>(
    new Set(),
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const cancelledRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => clearTimeout(copyTimerRef.current), []);

  const handleFileSelect = useCallback(async (files: FileList | File[]) => {
    const entries: VideoEntry[] = [];

    for (const file of Array.from(files)) {
      if (!SUPPORTED_TYPES.has(file.type)) {
        alert(
          `Unsupported format: ${file.name}\nSupported: MP4, WebM, MOV, AVI, MPEG, 3GPP`,
        );
        continue;
      }
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > MAX_FILE_SIZE_MB) {
        alert(
          `${file.name} is ${sizeMB.toFixed(1)}MB — max is ${MAX_FILE_SIZE_MB}MB`,
        );
        continue;
      }

      const thumbnail = await generateVideoThumbnail(file);

      entries.push({
        id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        file,
        name: file.name,
        sizeMB,
        thumbnailUrl: thumbnail,
      });
    }

    setVideos((prev) => [...prev, ...entries]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.files.length) handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect],
  );

  const removeVideo = useCallback((videoId: string) => {
    setVideos((prev) => prev.filter((v) => v.id !== videoId));
    setResults((prev) => prev.filter((r) => r.videoId !== videoId));
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (videos.length === 0 || !prompt.trim()) return;
    cancelledRef.current = false;
    setAnalyzing(true);
    setResults([]);

    const allResults: AnalysisResult[] = [];

    for (let i = 0; i < videos.length; i++) {
      if (cancelledRef.current) break;
      const video = videos[i];
      setProgress(
        `Uploading & analyzing ${video.name} (${i + 1}/${videos.length})…`,
      );

      try {
        const { text, usage } = await analyzeVideo(video.file, prompt.trim());

        if (usage) {
          recordUsage(
            usage as { promptTokenCount?: number; candidatesTokenCount?: number },
            "gemini-2.0-flash",
          );
        }

        allResults.push({ videoId: video.id, videoName: video.name, text });
      } catch (err) {
        allResults.push({
          videoId: video.id,
          videoName: video.name,
          text: "",
          error: err instanceof Error ? err.message : String(err),
        });
      }

      setResults([...allResults]);
    }

    setAnalyzing(false);
    setProgress("");

    setNodes((nds) =>
      nds.map((n) =>
        n.id === id
          ? {
              ...n,
              data: {
                ...(n.data as Record<string, unknown>),
                analysisResults: allResults,
                analysisPrompt: prompt,
              },
            }
          : n,
      ),
    );
  }, [videos, prompt, id, setNodes]);

  const handleCopy = useCallback((resultId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(resultId);
    clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleCopyAll = useCallback(() => {
    const allText = results
      .filter((r) => r.text)
      .map((r) => `=== ${r.videoName} ===\n\n${r.text}`)
      .join("\n\n---\n\n");
    navigator.clipboard.writeText(allText);
    setCopiedId("all");
    clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopiedId(null), 2000);
  }, [results]);

  const toggleExpand = useCallback((videoId: string) => {
    setExpandedResults((prev) => {
      const next = new Set(prev);
      if (next.has(videoId)) next.delete(videoId);
      else next.add(videoId);
      return next;
    });
  }, []);

  return (
    <div className={`va-node ${selected ? "selected" : ""}`}>
      <div className="va-header">
        <span className="va-label">Video Analysis</span>
        <span className="va-badge">
          {videos.length} video{videos.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="va-body">
        {/* Prompt */}
        <div className="va-section">
          <label className="va-field-label">Analysis Prompt</label>
          <textarea
            className="va-prompt nodrag nowheel"
            rows={5}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="How should Gemini analyze each video?"
          />
        </div>

        {/* Upload area */}
        <div
          className="va-upload-area nodrag"
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            multiple
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files?.length) handleFileSelect(e.target.files);
              e.target.value = "";
            }}
          />
          <div className="va-upload-icon">🎬</div>
          <div className="va-upload-text">
            Drop videos here or{" "}
            <span className="va-upload-link">browse</span>
          </div>
          <div className="va-upload-hint">
            MP4, WebM, MOV, AVI — up to {MAX_FILE_SIZE_MB}MB each
          </div>
        </div>

        {/* Video list */}
        {videos.length > 0 && (
          <div className="va-video-list nodrag nowheel">
            {videos.map((v) => (
              <div key={v.id} className="va-video-item">
                {v.thumbnailUrl ? (
                  <img
                    src={v.thumbnailUrl}
                    alt={v.name}
                    className="va-video-thumb"
                  />
                ) : (
                  <div className="va-video-thumb-placeholder">🎥</div>
                )}
                <div className="va-video-info">
                  <div className="va-video-name">{v.name}</div>
                  <div className="va-video-size">
                    {v.sizeMB.toFixed(1)} MB
                  </div>
                </div>
                <button
                  className="va-video-remove nodrag"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeVideo(v.id);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Analyze button */}
        <button
          className="va-run nodrag"
          onClick={(e) => {
            e.stopPropagation();
            if (analyzing) {
              cancelledRef.current = true;
            } else {
              handleAnalyze();
            }
          }}
          disabled={!analyzing && (videos.length === 0 || !prompt.trim())}
        >
          {analyzing
            ? "Cancel"
            : `Analyze ${videos.length} Video${videos.length !== 1 ? "s" : ""}`}
        </button>

        {analyzing && (
          <div className="va-loading">
            <div className="va-spinner" />
            <span>{progress}</span>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="va-results nodrag nowheel">
            <div className="va-results-header">
              <span className="va-field-label">Results</span>
              {results.filter((r) => r.text).length > 1 && (
                <button
                  className="va-copy-all nodrag"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyAll();
                  }}
                >
                  {copiedId === "all" ? "Copied!" : "Copy All"}
                </button>
              )}
            </div>
            {results.map((r) => (
              <div
                key={r.videoId}
                className={`va-result-card ${r.error ? "error" : ""}`}
              >
                <div
                  className="va-result-card-header"
                  onClick={() => toggleExpand(r.videoId)}
                >
                  <span className="va-result-card-name">{r.videoName}</span>
                  <div className="va-result-card-actions">
                    {r.text && (
                      <button
                        className="va-copy-btn nodrag"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(r.videoId, r.text);
                        }}
                      >
                        {copiedId === r.videoId ? "Copied!" : "Copy"}
                      </button>
                    )}
                    <span className="va-expand-arrow">
                      {expandedResults.has(r.videoId) ? "▾" : "▸"}
                    </span>
                  </div>
                </div>
                {r.error ? (
                  <div className="va-result-error">{r.error}</div>
                ) : (
                  <div
                    className={`va-result-text ${expandedResults.has(r.videoId) ? "expanded" : ""}`}
                  >
                    {expandedResults.has(r.videoId)
                      ? r.text
                      : r.text.slice(0, 200) +
                        (r.text.length > 200 ? "…" : "")}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="va-handle"
        style={{ background: "#26c6da" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="va-handle"
        style={{ background: "#e0e0e0" }}
      />
    </div>
  );
}

export default memo(VideoAnalysisNodeInner);
