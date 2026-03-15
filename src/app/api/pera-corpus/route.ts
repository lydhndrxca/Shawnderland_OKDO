import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const PERA_DIR = path.join(process.cwd(), "packages", "pera", "src");

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type");

  if (type === "chunks") {
    const filePath = path.join(PERA_DIR, "corpus", "chunks.json");
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ data: [], count: 0 });
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);
    return NextResponse.json({ data, count: data.length });
  }

  if (type === "decisions") {
    const filePath = path.join(PERA_DIR, "taxonomy", "decisions.json");
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ data: [], count: 0 });
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);
    return NextResponse.json({ data, count: data.length });
  }

  if (type === "stats") {
    const chunksPath = path.join(PERA_DIR, "corpus", "chunks.json");
    const decisionsPath = path.join(PERA_DIR, "taxonomy", "decisions.json");

    let chunksCount = 0;
    let decisionsCount = 0;

    if (fs.existsSync(chunksPath)) {
      const raw = fs.readFileSync(chunksPath, "utf-8");
      chunksCount = JSON.parse(raw).length;
    }
    if (fs.existsSync(decisionsPath)) {
      const raw = fs.readFileSync(decisionsPath, "utf-8");
      decisionsCount = JSON.parse(raw).length;
    }

    return NextResponse.json({
      chunksCount,
      decisionsCount,
      loaded: chunksCount > 0 || decisionsCount > 0,
    });
  }

  return NextResponse.json(
    { error: "Provide ?type=chunks|decisions|stats" },
    { status: 400 },
  );
}
