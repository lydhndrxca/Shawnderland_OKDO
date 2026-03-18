import { NextRequest, NextResponse } from "next/server";
import https from "node:https";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const ENV_API_KEY =
  process.env.GEMINI_API_KEY ?? process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? "";
const HOST = "generativelanguage.googleapis.com";

function resolveApiKey(req: NextRequest): string {
  return req.headers.get("x-api-key") || ENV_API_KEY || "";
}

function httpsRequest(
  options: https.RequestOptions,
  body?: Buffer | string,
  timeoutMs = 180_000,
): Promise<{ status: number; headers: Record<string, string>; body: string }> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      { ...options, timeout: timeoutMs },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          const hdrs: Record<string, string> = {};
          for (const [k, v] of Object.entries(res.headers)) {
            if (typeof v === "string") hdrs[k.toLowerCase()] = v;
            else if (Array.isArray(v)) hdrs[k.toLowerCase()] = v[0];
          }
          resolve({
            status: res.statusCode ?? 500,
            headers: hdrs,
            body: Buffer.concat(chunks).toString(),
          });
        });
      },
    );
    req.on("timeout", () => req.destroy(new Error("Request timed out")));
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function initiateResumableUpload(
  displayName: string,
  mimeType: string,
  fileSize: number,
  apiKey: string,
): Promise<string> {
  const metadata = JSON.stringify({ file: { display_name: displayName } });
  const res = await httpsRequest(
    {
      hostname: HOST,
      port: 443,
      path: `/upload/v1beta/files?key=${apiKey}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": String(fileSize),
        "X-Goog-Upload-Header-Content-Type": mimeType,
      },
    },
    metadata,
    30_000,
  );

  const uploadUrl = res.headers["x-goog-upload-url"];
  if (!uploadUrl) {
    throw new Error(
      `Failed to initiate upload (${res.status}): ${res.body.slice(0, 400)}`,
    );
  }
  return uploadUrl;
}

async function uploadFileBytes(
  uploadUrl: string,
  fileBuffer: Buffer,
): Promise<{ name: string; uri: string }> {
  const url = new URL(uploadUrl);
  const res = await httpsRequest(
    {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: "POST",
      headers: {
        "Content-Length": String(fileBuffer.length),
        "X-Goog-Upload-Offset": "0",
        "X-Goog-Upload-Command": "upload, finalize",
      },
    },
    fileBuffer,
    180_000,
  );

  if (res.status !== 200) {
    throw new Error(
      `Upload failed (${res.status}): ${res.body.slice(0, 400)}`,
    );
  }

  const json = JSON.parse(res.body);
  const fileInfo = json.file ?? json;
  return { name: fileInfo.name, uri: fileInfo.uri };
}

async function pollFileReady(
  fileName: string,
  apiKey: string,
  maxWaitMs = 120_000,
): Promise<string> {
  const start = Date.now();
  const pollPath = `/v1beta/${fileName}?key=${apiKey}`;

  while (Date.now() - start < maxWaitMs) {
    const res = await httpsRequest(
      { hostname: HOST, port: 443, path: pollPath, method: "GET" },
      undefined,
      15_000,
    );

    if (res.status === 200) {
      const info = JSON.parse(res.body);
      if (info.state === "ACTIVE") return info.uri;
      if (info.state === "FAILED")
        throw new Error("File processing failed on Google servers");
    }

    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("File processing timed out");
}

async function analyzeWithGemini(
  fileUri: string,
  mimeType: string,
  prompt: string,
  apiKey: string,
): Promise<{ text: string; usage?: Record<string, number> }> {
  const body = JSON.stringify({
    contents: [
      {
        parts: [
          { fileData: { mimeType, fileUri } },
          { text: prompt },
        ],
      },
    ],
    generationConfig: { temperature: 0.3 },
  });

  const res = await httpsRequest(
    {
      hostname: HOST,
      port: 443,
      path: `/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": String(Buffer.byteLength(body)),
      },
    },
    body,
    180_000,
  );

  if (res.status !== 200) {
    throw new Error(
      `Gemini error (${res.status}): ${res.body.slice(0, 400)}`,
    );
  }

  const json = JSON.parse(res.body);
  const text =
    json.candidates?.[0]?.content?.parts
      ?.filter((p: { text?: string }) => p.text)
      ?.map((p: { text?: string }) => p.text)
      ?.join("\n") ?? "";

  if (!text) throw new Error("No analysis returned from Gemini");

  return { text, usage: json.usageMetadata };
}

/**
 * POST /api/video-analyze
 * Accepts multipart form data: file (video) + prompt (text)
 * Uploads to Google AI Files API → polls → analyzes → returns text
 */
export async function POST(req: NextRequest) {
  try {
    const API_KEY = resolveApiKey(req);
    if (!API_KEY) {
      return NextResponse.json(
        { error: "API key not configured. Go to Settings and enter your Gemini API key." },
        { status: 500 },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const prompt = (formData.get("prompt") as string) ?? "";

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 },
      );
    }
    if (!prompt.trim()) {
      return NextResponse.json(
        { error: "No prompt provided" },
        { status: 400 },
      );
    }

    console.log(
      `[video-analyze] Uploading ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`,
    );

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadUrl = await initiateResumableUpload(
      file.name,
      file.type,
      buffer.length,
      API_KEY,
    );
    const { name: fileName } = await uploadFileBytes(
      uploadUrl,
      buffer,
    );

    console.log(`[video-analyze] Uploaded → ${fileName}, polling for ACTIVE...`);

    const activeUri = await pollFileReady(fileName, API_KEY);

    console.log(`[video-analyze] File ACTIVE, analyzing with Gemini...`);

    const { text, usage } = await analyzeWithGemini(
      activeUri,
      file.type,
      prompt,
      API_KEY,
    );

    console.log(
      `[video-analyze] Done — ${text.length} chars`,
    );

    return NextResponse.json({ text, usage });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[video-analyze] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
