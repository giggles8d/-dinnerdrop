import { NextResponse } from 'next/server'
import { libraryIndex } from '@/lib/recipe-index'

// The slim library index the /recipes filters run on. Public data, cached at the edge for 10 minutes.
export const revalidate = 600

export async function GET() {
  const rows = await libraryIndex()
  return NextResponse.json({ rows }, { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600' } })
}
