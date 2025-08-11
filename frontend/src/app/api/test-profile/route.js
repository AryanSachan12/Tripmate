import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'
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

export async function GET(request) {
  try {
    const user = await getAuthenticatedUser(request)
    console.log('Test profile - user:', user)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', user: null },
        { status: 401 }
      )
    }

    // Get user from database
    const { data: dbUser, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    console.log('Test profile - db user:', dbUser)
    console.log('Test profile - db error:', error)

    return NextResponse.json({
      message: 'Test successful',
      authUser: user,
      dbUser,
      error
    })

  } catch (error) {
    console.error('Test profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const user = await getAuthenticatedUser(request)
    console.log('Test profile POST - user:', user)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log('Test profile POST - body:', body)

    const { data, error } = await supabase
      .from('users')
      .update({
        name: body.name || 'Test Update',
        bio: body.bio || 'Test bio update',
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single()

    console.log('Test profile POST - result:', data)
    console.log('Test profile POST - error:', error)

    if (error) {
      return NextResponse.json(
        { error: error.message, details: error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: 'Test update successful',
      data
    })

  } catch (error) {
    console.error('Test profile POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
