import { NextResponse } from 'next/server';
export async function POST() {
  return NextResponse.json({ error: 'Report imports are retired. Use the authenticated analysis workflow.' }, { status: 410 });
}
