import { NextResponse } from 'next/server'
import { supabase } from '../../../../../lib/supabase'
import { cookies } from 'next/headers'

async function getAuthenticatedUser(request) {
  // Try to get token from Authorization header first
  const authHeader = request.headers.get('authorization')
  let token = null
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7)
  } else {
    // Fallback to cookies
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

export async function GET(request, { params }) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { tripId } = await params
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Check if user has access to this trip
    const { data: memberData } = await supabase
      .from('trip_members')
      .select('id')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!memberData) {
      return NextResponse.json(
        { error: 'Forbidden - You must be a trip member to view messages' },
        { status: 403 }
      )
    }

    const { data, error } = await supabase
      .from('trip_messages')
      .select(`
        *,
        user:users(id, name, avatar_url)
      `)
      .eq('trip_id', tripId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    // Get total count for pagination
    const { count } = await supabase
      .from('trip_messages')
      .select('*', { count: 'exact', head: true })
      .eq('trip_id', tripId)

    return NextResponse.json({
      messages: data,
      pagination: {
        page,
        limit,
        total: count || 0,
        hasMore: offset + limit < (count || 0)
      }
    })

  } catch (error) {
    console.error('Get messages error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request, { params }) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { tripId } = await params
    const { 
      message, 
      message_type = 'text', 
      file_url, 
      file_name, 
      file_size, 
      file_mime_type,
      reply_to 
    } = await request.json()

    // Check if user is a member of the trip
    const { data: memberData } = await supabase
      .from('trip_members')
      .select('id')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!memberData) {
      return NextResponse.json(
        { error: 'Forbidden - You must be a trip member to send messages' },
        { status: 403 }
      )
    }

    // Validate message content
    if (!message && !file_url) {
      return NextResponse.json(
        { error: 'Message content or file is required' },
        { status: 400 }
      )
    }

    // If replying to a message, verify it exists and belongs to this trip
    if (reply_to) {
      const { data: replyMessage } = await supabase
        .from('trip_messages')
        .select('id')
        .eq('id', reply_to)
        .eq('trip_id', tripId)
        .single()

      if (!replyMessage) {
        return NextResponse.json(
          { error: 'Reply message not found or does not belong to this trip' },
          { status: 400 }
        )
      }
    }

    const { data, error } = await supabase
      .from('trip_messages')
      .insert({
        trip_id: tripId,
        user_id: user.id,
        message: message || '',
        message_type,
        file_url,
        file_name,
        file_size,
        file_mime_type,
        reply_to
      })
      .select(`
        *,
        user:users(id, name, avatar_url)
      `)
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: 'Message sent successfully',
      data: data
    })

  } catch (error) {
    console.error('Send message error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
