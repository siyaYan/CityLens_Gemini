import { NextResponse } from 'next/server';
import { identifyLandmarkPaid } from '@/lib/gemini';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { image, mimeType } = (await request.json()) as { image?: string; mimeType?: string };
    if (!image) {
      return NextResponse.json({ error: 'Image is required.' }, { status: 400 });
    }

    const data = await identifyLandmarkPaid(image, mimeType);
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Unable to identify landmark.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
