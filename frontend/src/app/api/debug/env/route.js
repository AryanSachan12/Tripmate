import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    supabaseUrlExists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT_SET',
    supabaseKeyExists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabaseKeyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
    allEnvKeys: Object.keys(process.env).filter(key => key.includes('SUPABASE')),
    nodeEnv: process.env.NODE_ENV
  });
}
