import { NextResponse } from 'next/server';
import { getMicroskillContextByKey } from '@/lib/curriculum/server';

export async function GET(_req, { params }) {
  const { microskillId } = await params;
  const context = await getMicroskillContextByKey(microskillId);

  if (!context?.microskill) {
    return NextResponse.json(
      { error: 'Microskill not found.' },
      { status: 404 }
    );
  }

  return NextResponse.json(context);
}
