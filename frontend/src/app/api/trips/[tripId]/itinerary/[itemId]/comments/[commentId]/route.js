import { NextResponse } from 'next/server'
import { supabase } from '../../../../../../../../lib/supabase'
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

// PUT - Update a comment
export async function PUT(request, { params }) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { tripId, itemId, commentId } = await params
    const { comment, comment_type } = await request.json()

    if (!comment?.trim()) {
      return NextResponse.json(
        { error: 'Comment text is required' },
        { status: 400 }
      )
    }

    // Validate comment type if provided
    if (comment_type) {
      const validTypes = ['general', 'suggestion', 'concern', 'approval']
      if (!validTypes.includes(comment_type)) {
        return NextResponse.json(
          { error: 'Invalid comment type' },
          { status: 400 }
        )
      }
    }

    // Check if user has access to this trip
    const tripAccess = await checkTripAccess(tripId, user.id)
    if (!tripAccess) {
      return NextResponse.json(
        { error: 'Forbidden - You must be a trip member' },
        { status: 403 }
      )
    }

    // Check if comment exists and belongs to user
    const { data: existingComment, error: commentError } = await supabase
      .from('itinerary_comments')
      .select('user_id, itinerary_item_id')
      .eq('id', commentId)
      .single()

    if (commentError || !existingComment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      )
    }

    // Only allow user to edit their own comments
    if (existingComment.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden - You can only edit your own comments' },
        { status: 403 }
      )
    }

    // Verify the comment belongs to the specified itinerary item
    if (existingComment.itinerary_item_id !== itemId) {
      return NextResponse.json(
        { error: 'Comment does not belong to this itinerary item' },
        { status: 400 }
      )
    }

    // Update the comment
    const updateData = {
      comment: comment.trim(),
      updated_at: new Date().toISOString()
    }

    if (comment_type) {
      updateData.comment_type = comment_type
    }

    const { data: updatedComment, error } = await supabase
      .from('itinerary_comments')
      .update(updateData)
      .eq('id', commentId)
      .select(`
        *,
        user:users(id, name, avatar_url, first_name, last_name)
      `)
      .single()

    if (error) {
      console.error('Error updating comment:', error)
      return NextResponse.json(
        { error: 'Failed to update comment' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      comment: updatedComment,
      message: 'Comment updated successfully'
    })

  } catch (error) {
    console.error('Update comment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a comment
export async function DELETE(request, { params }) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { tripId, itemId, commentId } = await params

    // Check if user has access to this trip
    const tripAccess = await checkTripAccess(tripId, user.id)
    if (!tripAccess) {
      return NextResponse.json(
        { error: 'Forbidden - You must be a trip member' },
        { status: 403 }
      )
    }

    // Check if comment exists
    const { data: existingComment, error: commentError } = await supabase
      .from('itinerary_comments')
      .select('user_id, itinerary_item_id')
      .eq('id', commentId)
      .single()

    if (commentError || !existingComment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      )
    }

    // Allow user to delete their own comments, or admins to delete any comments
    const canDelete = existingComment.user_id === user.id || tripAccess.role === 'Admin'
    if (!canDelete) {
      return NextResponse.json(
        { error: 'Forbidden - You can only delete your own comments' },
        { status: 403 }
      )
    }

    // Verify the comment belongs to the specified itinerary item
    if (existingComment.itinerary_item_id !== itemId) {
      return NextResponse.json(
        { error: 'Comment does not belong to this itinerary item' },
        { status: 400 }
      )
    }

    // Delete the comment and decrement comment count
    const { error } = await supabase.rpc('delete_comment_with_count', {
      p_comment_id: commentId,
      p_itinerary_item_id: itemId
    })

    if (error) {
      console.error('Error deleting comment:', error)
      return NextResponse.json(
        { error: 'Failed to delete comment' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      message: 'Comment deleted successfully'
    })

  } catch (error) {
    console.error('Delete comment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
