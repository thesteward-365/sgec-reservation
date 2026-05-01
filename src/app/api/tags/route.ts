import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tags } from '@/lib/db/schema';

export async function GET() {
  const rows = await db.select().from(tags);
  return NextResponse.json(rows);
}
