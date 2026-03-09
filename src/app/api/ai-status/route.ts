import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET() {
  const hasKey = !!(process.env.GEMINI_API_KEY ?? process.env.NEXT_PUBLIC_GEMINI_API_KEY);
  return NextResponse.json({ hasKey });
}
