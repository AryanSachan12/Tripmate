import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { createServiceClient } from '../../../../lib/supabase'

export async function POST(request) {
  try {
    const { email, password, name } = await request.json()

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      )
    }

    // Sign up user with proper email confirmation
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
      }
    })

    if (error) {
      // Check if this is a user already registered error
      if (error.message.includes('User already registered')) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please try logging in instead.' },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    // Create user profile using service client for elevated permissions
    if (data.user) {
      const serviceClient = createServiceClient()
      
      try {
        // First check if user profile already exists
        const { data: existingUser, error: checkError } = await serviceClient
          .from('users')
          .select('id')
          .eq('id', data.user.id)
          .single()

        if (checkError && checkError.code !== 'PGRST116') {
          // PGRST116 means "not found", which is fine
          // Any other error is a problem
          console.error('Error checking existing user:', checkError)
        }

        if (!existingUser) {
          // User doesn't exist, create profile
          const { error: insertError } = await serviceClient
            .from('users')
            .insert({
              id: data.user.id,
              email: data.user.email,
              name,
              first_name: name.split(' ')[0],
              last_name: name.split(' ').slice(1).join(' ') || null,
              is_verified: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })

          if (insertError) {
            console.error('Profile creation error:', insertError)
            
            // If it's a duplicate key error, it means another request created the profile
            // between our check and insert - that's OK
            if (insertError.code === '23505') {
              console.log('Profile was created by another request, continuing')
            } else {
              return NextResponse.json(
                { 
                  error: 'Account creation failed. Please try again.',
                  details: insertError.message
                },
                { status: 500 }
              )
            }
          } else {
            console.log('User profile created successfully for:', data.user.email)
          }
        } else {
          // User profile already exists, update it
          const { error: updateError } = await serviceClient
            .from('users')
            .update({
              email: data.user.email,
              name,
              first_name: name.split(' ')[0],
              last_name: name.split(' ').slice(1).join(' ') || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', data.user.id)

          if (updateError) {
            console.error('Profile update error:', updateError)
            // Don't fail signup for update errors
          } else {
            console.log('User profile updated successfully for:', data.user.email)
          }
        }
      } catch (error) {
        console.error('Profile creation process error:', error)
        // Don't fail the signup if profile creation fails
        // The user was created in auth, so we can continue
        console.warn('Profile creation failed, but user was created in auth system')
      }
    }

    return NextResponse.json({
      message: 'Account created successfully! Please check your email to verify.',
      user: data.user
    })

  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
