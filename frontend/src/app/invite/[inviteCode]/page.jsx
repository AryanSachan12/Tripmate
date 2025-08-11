"use client";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useUser } from '../../../contexts/UserContext';
import { supabase } from '../../../lib/supabase';

export default function InvitePage() {
  const { inviteCode } = useParams();
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (inviteCode) {
      fetchInviteDetails();
    }
  }, [inviteCode]);

  const fetchInviteDetails = async () => {
    try {
      const response = await fetch(`/api/invites/${inviteCode}`);
      
      if (response.ok) {
        const result = await response.json();
        setInvite(result);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Invalid invite link');
      }
    } catch (error) {
      console.error('Error fetching invite:', error);
      setError('Failed to load invite details');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTrip = async () => {
    if (!user) {
      // Redirect to login with return URL
      router.push(`/auth?returnTo=/invite/${inviteCode}`);
      return;
    }

    // Check if password is required but not provided
    if (invite?.requiresPassword && !password.trim()) {
      setError('Please enter the password to join this trip');
      return;
    }

    setJoining(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        router.push(`/auth?returnTo=/invite/${inviteCode}`);
        return;
      }

      const requestBody = {};
      if (invite?.requiresPassword && password.trim()) {
        requestBody.password = password.trim();
      }

      const response = await fetch(`/api/invites/${inviteCode}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const result = await response.json();
        // Redirect to the trip page
        router.push(`/trip?id=${invite.trip.id}`);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to join trip');
      }
    } catch (error) {
      console.error('Error joining trip:', error);
      setError('An error occurred while joining the trip');
    } finally {
      setJoining(false);
    }
  };

  if (loading || userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invite details...</p>
        </div>
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invite</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link 
            href="/explore" 
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Explore Other Trips
          </Link>
        </div>
      </div>
    );
  }

  const { trip } = invite;

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="relative h-48 bg-gradient-to-r from-blue-500 to-purple-600">
            {trip.cover_image_url && (
              <Image
                src={trip.cover_image_url}
                alt={trip.title}
                fill
                className="object-cover"
              />
            )}
            <div className="absolute inset-0 bg-black bg-opacity-30"></div>
            <div className="relative h-full flex items-center justify-center text-white">
              <div className="text-center">
                <h1 className="text-3xl font-bold mb-2">You're Invited!</h1>
                <p className="text-xl">Join this amazing trip</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{trip.title}</h2>
              <p className="text-gray-600 text-lg">{trip.description}</p>
            </div>

            {/* Trip Details */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-gray-700">{trip.location}</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-gray-700">
                    {new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  <span className="text-gray-700">₹{trip.budget?.toLocaleString() || 'TBD'}</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="text-gray-700">{trip.current_members || 0} / {trip.max_members} members</span>
                </div>
                <div className="flex items-center">
                  <Image
                    src={trip.host?.avatar_url || '/profile-icon.png'}
                    alt={trip.host?.name || 'Host'}
                    width={24}
                    height={24}
                    className="rounded-full mr-3"
                  />
                  <span className="text-gray-700">Hosted by {trip.host?.name || 'Unknown'}</span>
                </div>
              </div>
            </div>

            {/* Tags */}
            {trip.tags && trip.tags.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Trip Highlights</h3>
                <div className="flex flex-wrap gap-2">
                  {trip.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Members Preview */}
            {trip.members && trip.members.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Current Members</h3>
                <div className="flex -space-x-2">
                  {trip.members.slice(0, 5).map((member, index) => (
                    <Image
                      key={index}
                      src={member.avatar_url || '/profile-icon.png'}
                      alt={member.name || 'Member'}
                      width={40}
                      height={40}
                      className="rounded-full border-2 border-white"
                    />
                  ))}
                  {trip.members.length > 5 && (
                    <div className="w-10 h-10 bg-gray-200 rounded-full border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
                      +{trip.members.length - 5}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Password Input */}
            {invite.requiresPassword && user && (
              <div className="mb-6">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  This trip is password protected
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            {/* Status Messages */}
            {invite.isAtCapacity && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p className="text-yellow-800 font-medium">This trip is currently at capacity</p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="text-center space-y-4">
              {user ? (
                <button
                  onClick={handleJoinTrip}
                  disabled={joining || invite.isAtCapacity}
                  className="w-full md:w-auto px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {joining ? 'Joining...' : invite.isAtCapacity ? 'Trip Full' : 'Join This Trip'}
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-gray-600">Please log in to join this trip</p>
                  <button
                    onClick={handleJoinTrip}
                    className="w-full md:w-auto px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    Log In & Join Trip
                  </button>
                </div>
              )}
              
              <div className="pt-4">
                <Link 
                  href="/explore" 
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Explore Other Trips →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
