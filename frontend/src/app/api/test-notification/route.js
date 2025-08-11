import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'
import { cookies } from 'next/headers'

async function getAuthenticatedUser(request) {
  const authHeader = request.headers.get('authorization')
  let token = null
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7)
  } else {
    const cookieStore = await cookies()
    const supabaseToken = cookieStore.get('supabase-auth-token')
    token = supabaseToken?.value
  }
  
  if (!token) {
    return null
  }

  const { data: { user }, error } = await supabase.auth.getUser(token)
  return error ? null : user
}

export async function POST(request) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('Creating test notification for user:', user.id);

    // Create a test notification
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        type: 'test',
        title: 'Test Notification',
        message: 'This is a test notification to verify the system is working',
        data: { test: true },
        is_sent: true,
        created_at: new Date().toISOString()
      })
      .select()

    if (error) {
      console.error('Error creating test notification:', error);
      return NextResponse.json(
        { error: 'Failed to create notification', details: error },
        { status: 500 }
      )
    }

    console.log('Successfully created test notification:', data);
    return NextResponse.json({
      success: true,
      notification: data
    })

  } catch (error) {
    console.error('Test notification API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
