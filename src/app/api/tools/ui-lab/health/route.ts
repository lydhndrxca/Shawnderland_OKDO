import { NextResponse } from "next/server";

const UI_LAB_URL = process.env.UI_LAB_URL || "http://localhost:4003";

export async function GET() {
  try {
    const res = await fetch(`${UI_LAB_URL}/api/health`, {
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      return NextResponse.json({ status: "ok" });
    }
    return NextResponse.json({ status: "down" }, { status: 502 });
  } catch {
    return NextResponse.json({ status: "down" }, { status: 502 });
  }
}
