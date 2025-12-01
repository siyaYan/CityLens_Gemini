import { NextResponse } from 'next/server';
import { generateNarrationPaid } from '@/lib/gemini';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { text } = (await request.json()) as { text?: string };
    if (!text) {
      return NextResponse.json({ error: 'text is required.' }, { status: 400 });
    }

    const audio = await generateNarrationPaid(text);
    return NextResponse.json({ audio });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Unable to generate narration.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
