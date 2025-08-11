import { NextResponse } from 'next/server'
import { supabase } from '../../../../../../../lib/supabase'
import { cookies } from 'next/headers'

async function getAuthenticatedUser(request) {
  try {
    const cookieStore = await cookies()
    const authCookie = cookieStore.get('sb-access-token')
    
    if (!authCookie) {
      const authHeader = request.headers.get('authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        return null
      }
      
      const token = authHeader.substring(7)
      const { data: { user }, error } = await supabase.auth.getUser(token)
      if (error || !user) return null
      return user
    }
    
    const { data: { user }, error } = await supabase.auth.getUser(authCookie.value)
    if (error || !user) return null
    return user
  } catch (error) {
    console.error('Auth error:', error)
    return null
  }
}

// Check if user has access to trip
async function checkTripAccess(tripId, userId) {
  const { data, error } = await supabase
    .from('trip_members')
    .select('role, status')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  if (error || !data) return null
  return data
}

// GET - Fetch comments for an itinerary item
export async function GET(request, { params }) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { tripId, itemId } = await params

    // Check if user has access to this trip
    const tripAccess = await checkTripAccess(tripId, user.id)
    if (!tripAccess) {
      return NextResponse.json(
        { error: 'Forbidden - You must be a trip member' },
        { status: 403 }
      )
    }

    // Verify the itinerary item belongs to this trip
    const { data: item, error: itemError } = await supabase
      .from('itinerary_items')
      .select('trip_id')
      .eq('id', itemId)
      .eq('trip_id', tripId)
      .single()

    if (itemError || !item) {
      return NextResponse.json(
        { error: 'Itinerary item not found' },
        { status: 404 }
      )
    }

    // Fetch comments with user data
    const { data: comments, error } = await supabase
      .from('itinerary_comments')
      .select(`
        *,
        user:users(id, name, avatar_url, first_name, last_name)
      `)
      .eq('itinerary_item_id', itemId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching comments:', error)
      return NextResponse.json(
        { error: 'Failed to fetch comments' },
        { status: 500 }
      )
    }

    return NextResponse.json({ comments })

  } catch (error) {
    console.error('Get comments error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Add a new comment
export async function POST(request, { params }) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { tripId, itemId } = await params
    const { comment, comment_type = 'general' } = await request.json()

    if (!comment?.trim()) {
      return NextResponse.json(
        { error: 'Comment text is required' },
        { status: 400 }
      )
    }

    // Validate comment type
    const validTypes = ['general', 'suggestion', 'concern', 'approval']
    if (!validTypes.includes(comment_type)) {
      return NextResponse.json(
        { error: 'Invalid comment type' },
        { status: 400 }
      )
    }

    // Check if user has access to this trip
    const tripAccess = await checkTripAccess(tripId, user.id)
    if (!tripAccess) {
      return NextResponse.json(
        { error: 'Forbidden - You must be a trip member' },
        { status: 403 }
      )
    }

    // Verify the itinerary item belongs to this trip
    const { data: item, error: itemError } = await supabase
      .from('itinerary_items')
      .select('trip_id')
      .eq('id', itemId)
      .eq('trip_id', tripId)
      .single()

    if (itemError || !item) {
      return NextResponse.json(
        { error: 'Itinerary item not found' },
        { status: 404 }
      )
    }

    // Insert the comment and increment comment count in a transaction
    const { data: newComment, error } = await supabase.rpc('add_comment_with_count', {
      p_itinerary_item_id: itemId,
      p_user_id: user.id,
      p_comment: comment.trim(),
      p_comment_type: comment_type
    })

    if (error) {
      console.error('Error creating comment:', error)
      return NextResponse.json(
        { error: 'Failed to create comment' },
        { status: 500 }
      )
    }

    // Fetch the full comment with user data
    const { data: fullComment, error: fetchError } = await supabase
      .from('itinerary_comments')
      .select(`
        *,
        user:users(id, name, avatar_url, first_name, last_name)
      `)
      .eq('id', newComment)
      .single()

    if (fetchError) {
      console.error('Error fetching comment:', fetchError)
      return NextResponse.json(
        { error: 'Comment created but failed to fetch details' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      comment: fullComment,
      message: 'Comment added successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Post comment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
