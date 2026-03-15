import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";

export async function GET() {
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/tags`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) {
      return NextResponse.json({ models: [] }, { status: 200 });
    }
    const json = await res.json();
    const names: string[] = (json.models || []).map(
      (m: { name: string }) => m.name,
    );
    return NextResponse.json({ models: names });
  } catch {
    return NextResponse.json({ models: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { model, prompt, system, temperature } = (await req.json()) as {
      model?: string;
      prompt?: string;
      system?: string;
      temperature?: number;
    };

    if (!model || !prompt) {
      return NextResponse.json(
        { error: "Provide 'model' and 'prompt'" },
        { status: 400 },
      );
    }

    const ollamaUrl = `${OLLAMA_HOST}/api/generate`;
    const payload: Record<string, unknown> = {
      model,
      prompt,
      system: system || "",
      stream: false,
    };
    if (typeof temperature === "number") {
      payload.options = { temperature };
    }
    const body = JSON.stringify(payload);

    const res = await fetch(ollamaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(90_000),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => `HTTP ${res.status}`);

      if (res.status === 404) {
        return NextResponse.json(
          { error: `Model '${model}' not found. Run: ollama pull ${model}` },
          { status: 404 },
        );
      }

      return NextResponse.json(
        { error: `Ollama error ${res.status}: ${err.slice(0, 400)}` },
        { status: res.status },
      );
    }

    const json = await res.json();
    return NextResponse.json({ text: json.response || "" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    if (msg.includes("ECONNREFUSED") || msg.includes("fetch failed")) {
      return NextResponse.json(
        {
          error:
            "Ollama not running. Start it with: ollama serve",
        },
        { status: 503 },
      );
    }

    console.error("[ai-local] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
