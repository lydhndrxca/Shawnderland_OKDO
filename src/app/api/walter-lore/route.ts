import { NextRequest, NextResponse } from "next/server";
import { readFile, readdir } from "fs/promises";
import { join } from "path";

const LORE_DIR = join(process.cwd(), "tools", "walter", "src", "lore");

export async function GET(req: NextRequest) {
  const ep = req.nextUrl.searchParams.get("episode");

  if (ep) {
    const num = String(Number(ep)).padStart(2, "0");
    const filePath = join(LORE_DIR, `episode-${num}.md`);
    try {
      const content = await readFile(filePath, "utf-8");
      return NextResponse.json({ episode: Number(ep), content });
    } catch {
      return NextResponse.json({ error: `Episode ${ep} not found` }, { status: 404 });
    }
  }

  try {
    const files = await readdir(LORE_DIR);
    const episodes = files
      .filter((f) => f.startsWith("episode-") && f.endsWith(".md"))
      .sort()
      .map((f) => {
        const num = parseInt(f.replace("episode-", "").replace(".md", ""), 10);
        return { num, file: f };
      });
    return NextResponse.json({ episodes, total: episodes.length });
  } catch {
    return NextResponse.json({ error: "Lore directory not found" }, { status: 500 });
  }
}
