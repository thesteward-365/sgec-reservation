import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { floors } from '@/lib/db/schema';
import { asc } from 'drizzle-orm';

export async function GET() {
  const rows = await db.select().from(floors).orderBy(asc(floors.order));
  return NextResponse.json(rows);
}
