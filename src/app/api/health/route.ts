import { NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';

export async function GET(): Promise<Response> {
  let dbUp = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbUp = true;
  } catch {
    dbUp = false;
  }
  const body = {
    ok: dbUp,
    db: dbUp ? 'up' : 'down',
    uptime: typeof process !== 'undefined' ? process.uptime() : 0,
  } as const;
  return NextResponse.json(body, { status: dbUp ? 200 : 503 });
}
