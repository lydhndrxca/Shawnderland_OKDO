const EMBED_URL = "/api/ai-embed";

export async function embedText(text: string): Promise<number[]> {
  const res = await fetch(EMBED_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(`Embedding error: ${err}`);
  }
  const json = await res.json();
  return json.embedding;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const res = await fetch(EMBED_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(`Batch embedding error: ${err}`);
  }
  const json = await res.json();
  return json.embeddings;
}
