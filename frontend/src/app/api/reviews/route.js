import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET - Fetch all trip reviews for community page
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '15')
    const sortBy = searchParams.get('sortBy') || 'recent' // recent, rating, location
    
    const offset = (page - 1) * limit

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Build the base query without auth.users join
    let query = supabase
      .from('trip_reviews')
      .select(`
        *,
        trip:trips!inner(
          id,
          title,
          location,
          primary_destination,
          start_date,
          end_date,
          status,
          created_by
        )
      `)
      .eq('trip.status', 'completed') // Only show reviews for completed trips

    // Apply sorting
    switch (sortBy) {
      case 'rating':
        query = query.order('rating', { ascending: false })
        break
      case 'location':
        query = query.order('created_at', { ascending: false }) // Fallback to date since location sorting is complex
        break
      default: // recent
        query = query.order('created_at', { ascending: false })
        break
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: reviews, error } = await query

    if (error) {
      console.error('Error fetching community reviews:', error)
      return NextResponse.json(
        { error: 'Failed to fetch reviews' },
        { status: 500 }
      )
    }

    // Format reviews for frontend
    const formattedReviews = await Promise.all(
      reviews.map(async (review) => {
        // Get user data using auth.admin (reviewer)
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(review.user_id)
        
        let userName = 'Anonymous'
        if (userData?.user && !userError) {
          userName = userData.user.user_metadata?.name || 
                    userData.user.email?.split('@')[0] || 
                    'Anonymous'
        }

        // Get trip creator data using auth.admin (host)
        let hostName = 'Unknown Host'
        if (review.trip.created_by) {
          const { data: hostData, error: hostError } = await supabase.auth.admin.getUserById(review.trip.created_by)
          
          if (hostData?.user && !hostError) {
            hostName = hostData.user.user_metadata?.name || 
                      hostData.user.email?.split('@')[0] || 
                      'Unknown Host'
          }
        }
        
        return {
          id: review.id,
          rating: review.rating,
          review_text: review.review_text,
          created_at: review.created_at,
          trip: {
            id: review.trip.id,
            title: review.trip.title,
            location: review.trip.primary_destination || review.trip.location || 'Unknown Location',
            startDate: review.trip.start_date,
            endDate: review.trip.end_date,
            duration: calculateTripDuration(review.trip.start_date, review.trip.end_date)
          },
          user: {
            id: review.user_id,
            name: userName
          },
          host: {
            name: hostName
          }
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: formattedReviews,
      pagination: {
        page,
        limit,
        total: reviews.length,
        hasMore: reviews.length === limit
      }
    })

  } catch (error) {
    console.error('Error in GET /api/reviews:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to calculate trip duration
function calculateTripDuration(startDate, endDate) {
  if (!startDate || !endDate) return 'Unknown duration'
  
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = Math.abs(end - start)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return `${diffDays} day${diffDays !== 1 ? 's' : ''}`
}
