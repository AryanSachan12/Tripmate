import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Helper function to get authenticated user
async function getAuthenticatedUser(request) {
  try {
    console.log('Getting authenticated user...')
    const cookieStore = await cookies()
    const authCookie = cookieStore.get('sb-access-token')
    
    console.log('Auth cookie found:', !!authCookie)
    
    if (!authCookie) {
      const authHeader = request.headers.get('authorization')
      console.log('Auth header:', authHeader ? 'present' : 'missing')
      
      if (!authHeader?.startsWith('Bearer ')) {
        console.log('No valid authorization header')
        return null
      }
      
      const token = authHeader.substring(7)
      console.log('Token extracted from header')
      
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
      const { data: { user }, error } = await supabase.auth.getUser(token)
      if (error) {
        console.error('Error getting user from token:', error)
        return null
      }
      if (!user) {
        console.log('No user found with token')
        return null
      }
      console.log('User authenticated via header:', user.id)
      return user
    }
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    const { data: { user: cookieUser }, error: cookieError } = await supabase.auth.getUser(authCookie.value)
    if (cookieError) {
      console.error('Error getting user from cookie:', cookieError)
      return null
    }
    if (!cookieUser) {
      console.log('No user found with cookie')
      return null
    }
    console.log('User authenticated via cookie:', cookieUser.id)
    return cookieUser
  } catch (error) {
    console.error('Auth error:', error)
    return null
  }
}

// GET - Fetch reviews for a trip
export async function GET(request, { params }) {
  try {
    const { tripId } = params
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Fetch reviews first
    const { data: reviews, error } = await supabase
      .from('trip_reviews')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching reviews:', error)
      return NextResponse.json(
        { error: 'Failed to fetch reviews' },
        { status: 500 }
      )
    }

    // Fetch user data for each review separately
    const formattedReviews = await Promise.all(
      reviews.map(async (review) => {
        // Get user data using auth.admin
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(review.user_id)
        
        let userName = 'Anonymous'
        if (userData?.user && !userError) {
          userName = userData.user.user_metadata?.name || 
                    userData.user.email?.split('@')[0] || 
                    'Anonymous'
        }

        return {
          id: review.id,
          rating: review.rating,
          review_text: review.review_text,
          created_at: review.created_at,
          updated_at: review.updated_at,
          user: {
            id: review.user_id,
            name: userName
          }
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: formattedReviews
    })

  } catch (error) {
    console.error('Error in GET /api/trips/[tripId]/reviews:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create a new review
export async function POST(request, { params }) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { tripId } = params
    const { rating, review_text } = await request.json()

    // Validate input
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Check if user was a member of the trip
    const { data: membership, error: membershipError } = await supabase
      .from('trip_members')
      .select('id')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'You must be a member of this trip to leave a review' },
        { status: 403 }
      )
    }

    // Check if trip is completed (or allow if user is admin for testing)
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('status')
      .eq('id', tripId)
      .single()

    if (tripError || !trip) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      )
    }

    // Check if user is admin of the trip
    const { data: userMembership } = await supabase
      .from('trip_members')
      .select('role')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    const isAdmin = userMembership?.role === 'Admin'

    if (trip.status !== 'completed' && !isAdmin) {
      return NextResponse.json(
        { error: 'Reviews can only be submitted for completed trips' },
        { status: 400 }
      )
    }

    // Check if user already reviewed this trip
    const { data: existingReview } = await supabase
      .from('trip_reviews')
      .select('id')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .single()

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this trip' },
        { status: 400 }
      )
    }

    // Create the review
    const { data: newReview, error: reviewError } = await supabase
      .from('trip_reviews')
      .insert({
        trip_id: tripId,
        user_id: user.id,
        rating,
        review_text: review_text || null
      })
      .select()
      .single()

    if (reviewError) {
      console.error('Error creating review:', reviewError)
      return NextResponse.json(
        { error: 'Failed to create review' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: newReview,
      message: 'Review submitted successfully'
    })

  } catch (error) {
    console.error('Error in POST /api/trips/[tripId]/reviews:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update an existing review
export async function PUT(request, { params }) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { tripId } = params
    const { rating, review_text } = await request.json()

    // Validate input
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Update the review
    const { data: updatedReview, error: updateError } = await supabase
      .from('trip_reviews')
      .update({
        rating,
        review_text: review_text || null
      })
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating review:', updateError)
      return NextResponse.json(
        { error: 'Failed to update review' },
        { status: 500 }
      )
    }

    if (!updatedReview) {
      return NextResponse.json(
        { error: 'Review not found or you do not have permission to update it' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedReview,
      message: 'Review updated successfully'
    })

  } catch (error) {
    console.error('Error in PUT /api/trips/[tripId]/reviews:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
