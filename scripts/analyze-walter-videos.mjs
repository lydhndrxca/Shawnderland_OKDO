/**
 * Batch Video Analysis — Walter Instagram Episodes
 * Uploads each video to Google AI Files API, analyzes with Gemini 2.0 Flash,
 * and compiles a master document.
 */

import https from "node:https";
import fs from "node:fs";
import path from "node:path";

const API_KEY = process.env.GEMINI_API_KEY ?? "";
const HOST = "generativelanguage.googleapis.com";
const VIDEO_DIR = "G:\\My Drive\\Walter Videos\\Walter_IG_Collection";
const OUTPUT_DIR = "G:\\My Drive\\Walter Videos\\Walter_IG_Collection";
const MASTER_FILE = path.join(OUTPUT_DIR, "Walter_Master_Analysis.md");

const ANALYSIS_PROMPT = `You are analyzing a Walter Instagram video episode — a short-form animated/visual storytelling series.

Provide a COMPREHENSIVE, IN-DEPTH analysis covering ALL of the following:

## EPISODE OVERVIEW
- One-paragraph summary of the entire episode
- Core theme/message
- Target emotion/reaction

## SCENE-BY-SCENE BREAKDOWN
For EACH distinct scene or visual segment:
- Scene number and timestamp range (estimate)
- What is happening visually (characters, actions, environment)
- Camera angle and movement (wide, close-up, pan, zoom, static, etc.)
- Visual style notes (colors, lighting, effects, text overlays)
- Duration estimate

## AUDIO & MUSIC
- Background music description (genre, mood, tempo, energy level)
- Sound effects present
- Voiceover/narration (transcribe key lines if present)
- Audio transitions between scenes

## STORY STRUCTURE & PACING
- Opening hook (first 1-3 seconds)
- How tension/interest builds
- Midpoint shift or twist (if any)
- Climax/peak moment
- Resolution/ending
- Call-to-action or loop point
- Overall pacing assessment (fast, moderate, slow, varied)

## ON-SCREEN TEXT & GRAPHICS
- All visible text (titles, captions, labels, watermarks)
- Graphics, logos, or overlays
- Text animation style

## PRODUCTION NOTES
- Estimated total duration
- Aspect ratio (9:16 vertical, 16:9 horizontal, 1:1 square)
- Overall production quality assessment
- Unique creative techniques used
- What makes this episode distinctive

## STORYBOARD RECONSTRUCTION
If you were to recreate this as a storyboard, list each shot:
| Shot # | Duration | Shot Type | Visual Description | Audio | On-Screen Text |
(Fill in a complete table)

Be thorough and specific. This analysis will be used to reconstruct episodes in a storyboarding tool.`;

function httpsRequest(options, body, timeoutMs = 180000) {
  return new Promise((resolve, reject) => {
    const req = https.request({ ...options, timeout: timeoutMs }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const hdrs = {};
        for (const [k, v] of Object.entries(res.headers)) {
          if (typeof v === "string") hdrs[k.toLowerCase()] = v;
          else if (Array.isArray(v)) hdrs[k.toLowerCase()] = v[0];
        }
        resolve({ status: res.statusCode ?? 500, headers: hdrs, body: Buffer.concat(chunks).toString() });
      });
    });
    req.on("timeout", () => req.destroy(new Error("Request timed out")));
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function initiateResumableUpload(displayName, mimeType, fileSize) {
  const metadata = JSON.stringify({ file: { display_name: displayName } });
  const res = await httpsRequest({
    hostname: HOST, port: 443,
    path: `/upload/v1beta/files?key=${API_KEY}`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(fileSize),
      "X-Goog-Upload-Header-Content-Type": mimeType,
    },
  }, metadata, 30000);

  const uploadUrl = res.headers["x-goog-upload-url"];
  if (!uploadUrl) throw new Error(`Failed to initiate upload (${res.status}): ${res.body.slice(0, 400)}`);
  return uploadUrl;
}

async function uploadFileBytes(uploadUrl, fileBuffer) {
  const url = new URL(uploadUrl);
  const res = await httpsRequest({
    hostname: url.hostname, port: 443,
    path: url.pathname + url.search,
    method: "POST",
    headers: {
      "Content-Length": String(fileBuffer.length),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
  }, fileBuffer, 300000);

  if (res.status !== 200) throw new Error(`Upload failed (${res.status}): ${res.body.slice(0, 400)}`);
  const json = JSON.parse(res.body);
  const fileInfo = json.file ?? json;
  return { name: fileInfo.name, uri: fileInfo.uri };
}

async function pollFileReady(fileName, maxWaitMs = 180000) {
  const start = Date.now();
  const pollPath = `/v1beta/${fileName}?key=${API_KEY}`;
  while (Date.now() - start < maxWaitMs) {
    const res = await httpsRequest({ hostname: HOST, port: 443, path: pollPath, method: "GET" }, undefined, 15000);
    if (res.status === 200) {
      const info = JSON.parse(res.body);
      if (info.state === "ACTIVE") return info.uri;
      if (info.state === "FAILED") throw new Error("File processing failed on Google servers");
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error("File processing timed out");
}

async function analyzeWithGemini(fileUri, mimeType, prompt) {
  const body = JSON.stringify({
    contents: [{ parts: [{ fileData: { mimeType, fileUri } }, { text: prompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 8192 },
  });

  const res = await httpsRequest({
    hostname: HOST, port: 443,
    path: `/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
    method: "POST",
    headers: { "Content-Type": "application/json", "Content-Length": String(Buffer.byteLength(body)) },
  }, body, 180000);

  if (res.status !== 200) throw new Error(`Gemini error (${res.status}): ${res.body.slice(0, 400)}`);
  const json = JSON.parse(res.body);
  const text = json.candidates?.[0]?.content?.parts?.filter(p => p.text)?.map(p => p.text)?.join("\n") ?? "";
  if (!text) throw new Error("No analysis returned from Gemini");
  return { text, usage: json.usageMetadata };
}

async function analyzeVideo(filePath, displayName) {
  const sizeMB = (fs.statSync(filePath).size / 1024 / 1024).toFixed(1);
  console.log(`  Uploading ${displayName} (${sizeMB} MB)...`);

  const fileBuffer = fs.readFileSync(filePath);
  const uploadUrl = await initiateResumableUpload(displayName, "video/mp4", fileBuffer.length);
  const { name: fileName } = await uploadFileBytes(uploadUrl, fileBuffer);

  console.log(`  Uploaded -> ${fileName}, waiting for processing...`);
  const activeUri = await pollFileReady(fileName);

  console.log(`  File active. Analyzing with Gemini...`);
  const fullPrompt = `VIDEO FILE: "${displayName}" (${sizeMB}MB)\n\nANALYSIS INSTRUCTIONS:\n${ANALYSIS_PROMPT}\n\nProvide a thorough, well-structured analysis.`;
  const { text, usage } = await analyzeWithGemini(activeUri, "video/mp4", fullPrompt);

  console.log(`  Analysis complete — ${text.length} chars, tokens: ${JSON.stringify(usage ?? {})}`);
  return text;
}

async function main() {
  console.log("=== Walter Instagram Video — Batch Analysis ===\n");

  const files = fs.readdirSync(VIDEO_DIR)
    .filter(f => f.startsWith("Walter_IG_") && f.endsWith(".mp4"))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] ?? "0");
      const numB = parseInt(b.match(/\d+/)?.[0] ?? "0");
      return numA - numB;
    });

  console.log(`Found ${files.length} videos to analyze.\n`);

  const results = [];
  let masterContent = `# Walter Instagram Series — Master Video Analysis\n\n`;
  masterContent += `**Generated:** ${new Date().toISOString()}\n`;
  masterContent += `**Episodes analyzed:** ${files.length}\n`;
  masterContent += `**Analysis model:** Gemini 2.0 Flash\n\n`;
  masterContent += `---\n\n`;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const epNum = parseInt(file.match(/\d+/)?.[0] ?? "0");
    const filePath = path.join(VIDEO_DIR, file);
    const sizeMB = (fs.statSync(filePath).size / 1024 / 1024).toFixed(1);

    console.log(`\n[${i + 1}/${files.length}] Episode ${epNum}: ${file} (${sizeMB} MB)`);

    try {
      const analysis = await analyzeVideo(filePath, file);
      results.push({ episode: epNum, file, analysis, error: null });

      masterContent += `# Episode ${epNum} — ${file}\n\n`;
      masterContent += `**File:** ${file} | **Size:** ${sizeMB} MB\n\n`;
      masterContent += analysis;
      masterContent += `\n\n---\n\n`;

      // Write progress after each episode
      fs.writeFileSync(MASTER_FILE, masterContent, "utf-8");
      console.log(`  Saved progress to master document.`);

      // Brief pause between requests to avoid rate limiting
      if (i < files.length - 1) {
        console.log(`  Pausing 5s before next video...`);
        await new Promise(r => setTimeout(r, 5000));
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`  ERROR: ${errMsg}`);
      results.push({ episode: epNum, file, analysis: null, error: errMsg });

      masterContent += `# Episode ${epNum} — ${file}\n\n`;
      masterContent += `**ERROR:** ${errMsg}\n\n`;
      masterContent += `---\n\n`;
      fs.writeFileSync(MASTER_FILE, masterContent, "utf-8");

      // Wait longer after errors (might be rate limited)
      console.log(`  Waiting 15s after error...`);
      await new Promise(r => setTimeout(r, 15000));
    }
  }

  // Final summary
  const succeeded = results.filter(r => !r.error).length;
  const failed = results.filter(r => r.error).length;

  masterContent += `\n# Summary\n\n`;
  masterContent += `- **Total episodes:** ${results.length}\n`;
  masterContent += `- **Successfully analyzed:** ${succeeded}\n`;
  masterContent += `- **Failed:** ${failed}\n`;
  if (failed > 0) {
    masterContent += `\n**Failed episodes:**\n`;
    results.filter(r => r.error).forEach(r => {
      masterContent += `- Episode ${r.episode}: ${r.error}\n`;
    });
  }

  fs.writeFileSync(MASTER_FILE, masterContent, "utf-8");
  console.log(`\n=== DONE ===`);
  console.log(`Analyzed: ${succeeded}/${results.length}`);
  console.log(`Master document: ${MASTER_FILE}`);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
