import { NextRequest, NextResponse } from "next/server";
import https from "node:https";

export const dynamic = "force-dynamic";

const ENV_API_KEY =
  process.env.GEMINI_API_KEY ?? process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? "";
const HOST = "generativelanguage.googleapis.com";
const MODEL = "gemini-embedding-001";

function resolveApiKey(req: NextRequest): string {
  return ENV_API_KEY || req.headers.get("x-api-key") || "";
}

function httpsPost(
  path: string,
  body: string,
  timeoutMs: number,
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: HOST,
        port: 443,
        path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
        timeout: timeoutMs,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode ?? 500,
            body: Buffer.concat(chunks).toString(),
          });
        });
      },
    );
    req.on("timeout", () => req.destroy(new Error("Request timed out")));
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

export async function POST(req: NextRequest) {
  try {
    const API_KEY = resolveApiKey(req);
    if (!API_KEY) {
      return NextResponse.json(
        { error: "API key not configured. Go to Settings and enter your Gemini API key." },
        { status: 500 },
      );
    }

    const payload = await req.json();
    const { text, texts } = payload as {
      text?: string;
      texts?: string[];
    };

    if (texts && Array.isArray(texts)) {
      const requests = texts.map((t) => ({
        model: `models/${MODEL}`,
        content: { parts: [{ text: t }] },
      }));

      const path = `/v1beta/models/${MODEL}:batchEmbedContents?key=${API_KEY}`;
      const result = await httpsPost(
        path,
        JSON.stringify({ requests }),
        60_000,
      );

      if (result.status !== 200) {
        return NextResponse.json(
          { error: `Upstream ${result.status}: ${result.body.slice(0, 400)}` },
          { status: result.status },
        );
      }

      const json = JSON.parse(result.body);
      const embeddings = json.embeddings.map(
        (e: { values: number[] }) => e.values,
      );
      return NextResponse.json({ embeddings });
    }

    if (text && typeof text === "string") {
      const path = `/v1beta/models/${MODEL}:embedContent?key=${API_KEY}`;
      const body = JSON.stringify({
        model: `models/${MODEL}`,
        content: { parts: [{ text }] },
      });

      const result = await httpsPost(path, body, 30_000);

      if (result.status !== 200) {
        return NextResponse.json(
          { error: `Upstream ${result.status}: ${result.body.slice(0, 400)}` },
          { status: result.status },
        );
      }

      const json = JSON.parse(result.body);
      return NextResponse.json({ embedding: json.embedding.values });
    }

    return NextResponse.json(
      { error: "Provide either 'text' (string) or 'texts' (string[])" },
      { status: 400 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[ai-embed] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
