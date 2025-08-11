import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Helper function to get authenticated user
async function getAuthenticatedUser(request) {
  try {
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

    // Create a supabase client and set the session
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    // Set the session with the token
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error) {
      console.error('Auth error:', error)
      return null
    }
    
    return user
  } catch (error) {
    console.error('Error getting authenticated user:', error)
    return null
  }
}

// Cache for expensive queries
const queryCache = new Map()
const CACHE_DURATION = 2 * 60 * 1000 // 2 minutes

function getCacheKey(filters = {}) {
  return `trips:${JSON.stringify(filters)}`
}

function getFromCache(key) {
  const cached = queryCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }
  queryCache.delete(key)
  return null
}

function setCache(key, data) {
  queryCache.set(key, {
    data,
    timestamp: Date.now()
  })
}

export async function GET(request) {
  const startTime = Date.now()
  
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const location = searchParams.get('location')
    const tags = searchParams.get('tags')?.split(',').filter(Boolean)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const status = searchParams.get('status')
    const visibility = searchParams.get('visibility')
    
    const offset = (page - 1) * limit

    // Create cache key for this query
    const cacheKey = getCacheKey({
      page, limit, location, tags, startDate, endDate, status, visibility
    })

    // Check cache first
    const cachedResult = getFromCache(cacheKey)
    if (cachedResult) {
      console.log(`Cache hit for trips query (${Date.now() - startTime}ms)`)
      return NextResponse.json(cachedResult)
    }

    // Create Supabase client for database operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    let query = supabase
      .from('trip_details')
      .select('*')

    // Apply visibility filter - for explore page, only show public trips
    // Private trips are never shown in explore
    // Link-only trips are also not shown in explore (only accessible via direct links)
    if (visibility) {
      query = query.eq('visibility', visibility)
    } else {
      // Default for explore page: only show public trips
      query = query.eq('visibility', 'public')
    }

    query = query.order('created_at', { ascending: false })

    // Apply status filter
    if (status) {
      query = query.eq('status', status)
    } else {
      // Default to planning trips for explore page
      query = query.eq('status', 'planning')
    }

    // Apply filters
    if (location) {
      query = query.ilike('location', `%${location}%`)
    }
    
    if (tags && tags.length > 0) {
      query = query.overlaps('tags', tags)
    }
    
    if (startDate) {
      query = query.gte('start_date', startDate)
    }
    
    if (endDate) {
      query = query.lte('end_date', endDate)
    }

    const { data, error } = await query.range(offset, offset + limit - 1)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    const result = {
      trips: data,
      pagination: {
        page,
        limit,
        total: data.length
      }
    }

    // Cache the result
    setCache(cacheKey, result)

    const duration = Date.now() - startTime
    console.log(`Trips query completed in ${duration}ms`)

    return NextResponse.json(result)

  } catch (error) {
    console.error('Get trips error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  const startTime = Date.now()
  
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const tripData = await request.json()

    // Validate required fields
    const requiredFields = ['title', 'location', 'start_date', 'end_date', 'max_members']
    for (const field of requiredFields) {
      if (!tripData[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        )
      }
    }

    // Create Supabase client for database operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    // Step 1: Create the trip
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .insert({
        ...tripData,
        created_by: user.id,
        current_members: 1, // Creator is automatically a member
        status: 'planning',
        visibility: tripData.visibility || 'public'
      })
      .select()
      .single()

    if (tripError) {
      console.error('Trip creation error:', tripError)
      return NextResponse.json(
        { error: tripError.message },
        { status: 400 }
      )
    }

    // Step 2: Add creator as admin member
    // First check if user is already a member (shouldn't happen in normal flow, but safety check)
    const { data: existingMember } = await supabase
      .from('trip_members')
      .select('id')
      .eq('trip_id', trip.id)
      .eq('user_id', user.id)
      .single()

    let member
    if (existingMember) {
      // Update existing member to Admin role
      const { data: updatedMember, error: updateError } = await supabase
        .from('trip_members')
        .update({
          role: 'Admin',
          status: 'active',
          joined_at: new Date().toISOString()
        })
        .eq('id', existingMember.id)
        .select()
        .single()

      if (updateError) {
        await supabase.from('trips').delete().eq('id', trip.id)
        console.error('Member update error:', updateError)
        return NextResponse.json(
          { error: `Failed to update creator membership: ${updateError.message}` },
          { status: 400 }
        )
      }
      member = updatedMember
    } else {
      // Insert new member
      const { data: newMember, error: memberError } = await supabase
        .from('trip_members')
        .insert({
          trip_id: trip.id,
          user_id: user.id,
          role: 'Admin',
          status: 'active',
          joined_at: new Date().toISOString()
        })
        .select()
        .single()

      if (memberError) {
        // Rollback trip creation if member addition fails
        await supabase.from('trips').delete().eq('id', trip.id)
        console.error('Member creation error:', memberError)
        return NextResponse.json(
          { error: `Failed to add creator as member: ${memberError.message}` },
          { status: 400 }
        )
      }
      member = newMember
    }

    // Clear cache for public trips
    queryCache.clear()

    const duration = Date.now() - startTime
    console.log(`Trip creation completed in ${duration}ms`)

    return NextResponse.json({
      success: true,
      data: {
        trip,
        member
      }
    })

  } catch (error) {
    console.error('Create trip error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
