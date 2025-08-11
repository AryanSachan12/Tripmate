"use client";
import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { userApi } from '../lib/api';
import { clearSessionCache } from '../lib/api';
import clientCache from '../lib/client-cache';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if Supabase is properly configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey || 
        supabaseUrl === 'your_supabase_url_here' || 
        supabaseKey === 'your_supabase_anon_key_here' ||
        !supabaseUrl.startsWith('http')) {
      console.warn('⚠️ Supabase not configured - running in development mode');
      setLoading(false);
      return;
    }

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }

        if (session?.user) {
          // Check if this is a Google user and handle avatar
          const isGoogleAuth = session.user.app_metadata?.provider === 'google';
          const googleAvatar = session.user.user_metadata?.avatar_url;
          
          // Get user profile data
          try {
            const profileResponse = await userApi.getProfile();
            let profileData = null;
            
            if (profileResponse.success && profileResponse.data) {
              console.log('Profile loaded:', profileResponse.data);
              profileData = profileResponse.data.user || profileResponse.data;
              
              // If user is Google user and has no stored avatar, store the Google avatar
              if (isGoogleAuth && googleAvatar && !profileData.avatar_url) {
                console.log('Storing Google avatar for existing session:', googleAvatar);
                try {
                  const updateResponse = await userApi.updateProfile({
                    avatar_url: googleAvatar
                  });
                  if (updateResponse.success) {
                    profileData = { ...profileData, avatar_url: googleAvatar };
                    console.log('Google avatar stored successfully for existing session');
                  } else {
                    console.warn('Failed to store Google avatar for existing session:', updateResponse.error);
                  }
                } catch (avatarError) {
                  console.error('Error storing Google avatar for existing session:', avatarError);
                }
              }
              
              setUser({
                ...session.user,
                profile: profileData
              });
            } else {
              console.warn('Failed to load profile:', profileResponse.error);
              setUser({
                ...session.user,
                profile: null
              });
            }
          } catch (profileError) {
            console.error('Error loading profile:', profileError);
            setUser({
              ...session.user,
              profile: null
            });
          }
        }
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        
        if (event === 'SIGNED_IN' && session?.user) {
          // Check if this is a Google OAuth signin and handle avatar
          const isGoogleAuth = session.user.app_metadata?.provider === 'google';
          const googleAvatar = session.user.user_metadata?.avatar_url;
          
          console.log('User signed in:', {
            isGoogleAuth,
            googleAvatar,
            userMetadata: session.user.user_metadata,
            appMetadata: session.user.app_metadata
          });
          
          // Get user profile data
          try {
            const profileResponse = await userApi.getProfile();
            let profileData = null;
            
            if (profileResponse.success && profileResponse.data) {
              console.log('Profile loaded on sign in:', profileResponse.data);
              profileData = profileResponse.data.user || profileResponse.data;
              
              // If user signed in with Google and has no stored avatar, store the Google avatar
              if (isGoogleAuth && googleAvatar && !profileData.avatar_url) {
                console.log('Storing Google avatar for user:', googleAvatar);
                try {
                  const updateResponse = await userApi.updateProfile({
                    avatar_url: googleAvatar
                  });
                  if (updateResponse.success) {
                    profileData = { ...profileData, avatar_url: googleAvatar };
                    console.log('Google avatar stored successfully');
                  } else {
                    console.warn('Failed to store Google avatar:', updateResponse.error);
                  }
                } catch (avatarError) {
                  console.error('Error storing Google avatar:', avatarError);
                }
              }
              
              setUser({
                ...session.user,
                profile: profileData
              });
            } else {
              console.warn('Failed to load profile on sign in:', profileResponse.error);
              
              // If no profile exists but it's a Google signin, create basic profile with avatar
              if (isGoogleAuth) {
                const name = session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'User';
                try {
                  const createResponse = await userApi.updateProfile({
                    name: name,
                    first_name: name.split(' ')[0],
                    last_name: name.split(' ').slice(1).join(' ') || null,
                    avatar_url: googleAvatar || null
                  });
                  
                  if (createResponse.success) {
                    console.log('Created profile for Google user with avatar');
                    setUser({
                      ...session.user,
                      profile: createResponse.data
                    });
                  } else {
                    console.warn('Failed to create profile for Google user:', createResponse.error);
                    setUser({
                      ...session.user,
                      profile: null
                    });
                  }
                } catch (createError) {
                  console.error('Error creating profile for Google user:', createError);
                  setUser({
                    ...session.user,
                    profile: null
                  });
                }
              } else {
                setUser({
                  ...session.user,
                  profile: null
                });
              }
            }
          } catch (profileError) {
            console.error('Error loading profile on sign in:', profileError);
            setUser({
              ...session.user,
              profile: null
            });
          }
        } else if (event === 'SIGNED_OUT') {
          clearSessionCache(); // Clear API cache on logout
          clientCache.clear(); // Clear all client-side cache
          setUser(null);
        } else if (event === 'TOKEN_REFRESHED') {
          clearSessionCache(); // Clear cache to get new token
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const updateUser = (userData) => {
    setUser(prev => ({ 
      ...prev, 
      profile: { ...prev?.profile, ...userData }
    }));
  };

  const updateProfile = async (updates) => {
    try {
      const response = await userApi.updateProfile(updates);
      if (response.success) {
        // Update the user state with the new profile data
        // The API response has the updated user data in response.data.user
        const updatedUserData = response.data.user || response.data;
        setUser(prev => ({
          ...prev,
          profile: { ...prev?.profile, ...updatedUserData }
        }));
        return { success: true, data: updatedUserData };
      } else {
        return { success: false, error: response.error };
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      }
      setUser(null);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const value = {
    user,
    loading,
    updateUser,
    updateProfile,
    logout,
    isAuthenticated: !!user
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
