import { NextResponse } from 'next/server';
import { getLandmarkDetailsPaid } from '@/lib/gemini';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { landmarkName } = (await request.json()) as { landmarkName?: string };
    if (!landmarkName) {
      return NextResponse.json({ error: 'landmarkName is required.' }, { status: 400 });
    }

    const details = await getLandmarkDetailsPaid(landmarkName);
    return NextResponse.json(details);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Unable to fetch landmark details.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
