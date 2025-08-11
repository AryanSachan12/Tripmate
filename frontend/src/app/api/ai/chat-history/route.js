import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tripId = searchParams.get('tripId');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!tripId) {
      return NextResponse.json(
        { error: 'Trip ID is required' },
        { status: 400 }
      );
    }

    // Get the user from the Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authorization token' },
        { status: 401 }
      );
    }

    // Fetch chat history for the trip
    const { data: history, error } = await supabase
      .from('ai_chat_history')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching chat history:', error);
      return NextResponse.json(
        { error: 'Failed to fetch chat history' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      history: history || []
    });

  } catch (error) {
    console.error('Chat history API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
