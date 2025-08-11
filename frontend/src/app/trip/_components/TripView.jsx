"use client";
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useUser } from '../../../contexts/UserContext';
import { supabase } from '../../../lib/supabase';
import { getStatusColor } from '../../../lib/utils';
import Itinerary from './Itinerary';
import TripChat from './TripChat';
import TripAIHelper from './TripAIHelper';
import TripSettings from './TripSettings';
import InviteLinkModal from './InviteLinkModal';
import JoinRequestsManager from './JoinRequestsManager';
import JoinRequestModal from './JoinRequestModal';
import ExpenseManager from './ExpenseManager';

export default function TripView({ trip, onTripUpdated }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showSettings, setShowSettings] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [initialSettingsTab, setInitialSettingsTab] = useState('general');
  const [showJoinRequestModal, setShowJoinRequestModal] = useState(false);
  const [joinRequestStatus, setJoinRequestStatus] = useState(null);
  const [joinRequestData, setJoinRequestData] = useState(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [wasRemoved, setWasRemoved] = useState(false);
  const [tripCities, setTripCities] = useState([]);
  const [imageError, setImageError] = useState(false);
  const { user } = useUser();

  // Format date utility
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Function to fetch cities for this trip
  const fetchTripCities = async () => {
    if (!trip?.id || (trip.total_cities || 1) <= 1) return;

    try {
      const response = await fetch(`/api/trips/${trip.id}/cities`);
      if (response.ok) {
        const data = await response.json();
        setTripCities(data.cities || []);
      } else {
        console.warn('Failed to fetch cities for trip:', response.status);
      }
    } catch (error) {
      console.error('Error fetching trip cities:', error);
    }
  };

  // Function to get cities display
  const getCitiesDisplay = () => {
    const totalCities = trip?.total_cities || 1;
    
    if (totalCities <= 1) {
      return trip?.primary_destination || trip?.destination || trip?.location || 'Unknown Location';
    }
    
    if (tripCities.length > 0) {
      const cityNames = tripCities
        .sort((a, b) => a.order_index - b.order_index)
        .map(city => city.city_name);
      
      return cityNames.join(' → ');
    }
    
    // Fallback while loading
    const primaryDestination = trip?.primary_destination || trip?.destination || trip?.location || 'Location';
    const additionalCount = Math.max(0, totalCities - 1);
    return additionalCount > 0 ? `${primaryDestination} +${additionalCount} more` : primaryDestination;
  };

  // Load cities when trip changes
  useEffect(() => {
    if (trip?.id) {
      fetchTripCities();
      setImageError(false); // Reset image error when trip changes
    }
  }, [trip?.id, trip?.total_cities]);

  // Check user's relationship to this trip
  const isMember = trip?.userRole && trip.userRole !== 'None';
  const isAdmin = trip?.userRole === 'Admin';
  const canEdit = trip?.userRole === 'Admin' || trip?.userRole === 'Manager';
  const canManageRequests = canEdit;

  // Check for existing join request when component loads
  useEffect(() => {
    const checkJoinRequestStatus = async () => {
      if (!user || !trip?.id || isMember) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        console.log('Checking join request status for trip:', trip.id);

        // First check if user was previously a member but removed
        const { data: removedMember } = await supabase
          .from('trip_members')
          .select('id, status')
          .eq('trip_id', trip.id)
          .eq('user_id', user.id)
          .eq('status', 'removed')
          .single();

        if (removedMember) {
          console.log('User was removes from trip:', removedMember);
          setWasRemoved(true);
          return; // Don't check for join requests if user was removed
        }

        // Check if user has a pending join request
        const response = await fetch(`/api/trips/${trip.id}/join`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Join request status:', data);
          if (data.hasPendingRequest) {
            setJoinRequestStatus('requested');
          } else if (data.hasRejectedRequest) {
            setJoinRequestStatus('rejected');
            setJoinRequestData({
              reviewMessage: data.reviewMessage,
              reviewedAt: data.reviewedAt
            });
          } else if (data.hasApprovedRequest) {
            setJoinRequestStatus('approved');
          }
        } else {
          console.log('Failed to check join request status:', response.status);
        }
      } catch (error) {
        console.error('Error checking join request status:', error);
      }
    };

    checkJoinRequestStatus();
  }, [user, trip?.id, isMember]);

  // Safety check - don't render if trip data is not available
  if (!trip) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading trip details...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: 'info' },
    { id: 'itinerary', name: 'Itinerary', icon: 'calendar' },
    { id: 'expenses', name: 'Expenses', icon: 'money' },
    { id: 'chat', name: 'Chat', icon: 'chat' },
    { id: 'ai', name: 'AI Assistant', icon: 'ai' }
  ];

  const getStatusColor = (role) => {
    switch (role) {
      case 'Admin': return 'bg-purple-100 text-purple-800';
      case 'Manager': return 'bg-blue-100 text-blue-800';
      case 'Traveller': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleJoinTrip = async (message) => {
    if (!user) {
      alert('Please log in to join this trip');
      return;
    }

    setIsRequesting(true);
    
    try {
      // Get the current session to get the access token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        alert('Please log in again to join this trip');
        return;
      }

      const response = await fetch(`/api/trips/${trip.id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message: message || 'I would like to join this trip.'
        }),
      });

      if (response.ok) {
        setJoinRequestStatus('requested');
        setJoinRequestData(null);
        setShowJoinRequestModal(false);
        alert('Join request sent successfully! You will be notified when it is reviewed.');
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error sending join request:', error);
      alert('Failed to send join request. Please try again.');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDirectJoin = async () => {
    if (!user || !trip?.id) return;

    setIsJoining(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        alert('Please log in to join this trip');
        return;
      }

      const response = await fetch(`/api/trips/${trip.id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          auto_join: true // Flag to indicate direct joining
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert('Successfully joined the trip!');
        // Refresh the page or update the trip data
        if (onTripUpdated) {
          onTripUpdated();
        }
      } else {
        alert(result.error || 'Failed to join trip');
      }
    } catch (error) {
      console.error('Error joining trip:', error);
      alert('An error occurred while joining the trip');
    } finally {
      setIsJoining(false);
    }
  };

  const renderTabIcon = (iconType) => {
    const iconClass = "w-5 h-5";
    switch (iconType) {
      case 'info':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'calendar':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'money':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case 'money':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        );
      case 'chat':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        );
      case 'ai':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-4 sm:space-y-6">
            {/* Trip Header */}
            <div className="relative h-48 sm:h-64 rounded-xl sm:rounded-2xl overflow-hidden">
              <Image
                src={imageError ? '/placeholder.png' : (trip.cover_image_url || trip.coverImage || '/placeholder.png')}
                alt={trip.title || 'Trip'}
                fill
                className="object-cover"
                onError={() => setImageError(true)}
              />
              <div className="absolute inset-0 bg-black bg-opacity-40" />
              <div className="absolute top-4 sm:top-6 left-4 sm:left-6">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(trip.status)}`}>
                  {trip.status ? trip.status.charAt(0).toUpperCase() + trip.status.slice(1) : 'Unknown'}
                </span>
              </div>
              <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 right-4 sm:right-6 text-white">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">{trip.title || 'Untitled Trip'}</h1>
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-1 sm:space-y-0 text-xs sm:text-sm">
                  <span className="flex items-center">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {getCitiesDisplay()}
                  </span>
                  <span className="flex items-center">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {trip.start_date || trip.startDate || 'TBD'} - {trip.end_date || trip.endDate || 'TBD'}
                  </span>
                  <span className="flex items-center">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {(trip.trip_members?.filter(m => m.status === 'active' || !m.status).length || trip.members?.filter(m => m.status === 'active' || !m.status).length || 0)}/{trip.max_members || trip.maxMembers || '∞'} members
                  </span>
                </div>
              </div>
            </div>

            {/* Description and Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">About This Trip</h2>
                  <p className="text-gray-600 leading-relaxed mb-4 sm:mb-6 text-sm sm:text-base">
                    {trip.description || 'No description available.'}
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    {(trip.tags || []).map(tag => (
                      <span key={tag} className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Trip Info */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Trip Details</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Budget</span>
                      <span className="font-semibold">{trip.budget || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Group Size</span>
                      <span className="font-semibold">
                        {(trip.trip_members?.filter(m => m.status === 'active' || !m.status).length || trip.members?.filter(m => m.status === 'active' || !m.status).length || 0)}/{trip.max_members || trip.maxMembers || '∞'}
                      </span>
                    </div>
                    {isMember && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Your Role</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(trip.userRole || 'Traveller')}`}>
                          {trip.userRole || 'Traveller'}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Visibility</span>
                      <span className="font-semibold capitalize">{trip.visibility || 'public'}</span>
                    </div>
                  </div>
                </div>

                {/* Multi-City Route (if applicable) */}
                {(trip.total_cities || 1) > 1 && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Travel Route</h3>
                    {tripCities.length > 0 ? (
                      <div className="space-y-3">
                        {tripCities
                          .sort((a, b) => a.order_index - b.order_index)
                          .map((city, index) => (
                          <div key={city.id} className="flex items-center space-x-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{city.city_name}</p>
                              {city.country && (
                                <p className="text-sm text-gray-500 truncate">{city.country}</p>
                              )}
                              {(city.arrival_date || city.departure_date) && (
                                <p className="text-xs text-gray-400">
                                  {city.arrival_date && new Date(city.arrival_date).toLocaleDateString()}
                                  {city.arrival_date && city.departure_date && ' - '}
                                  {city.departure_date && new Date(city.departure_date).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            {index < tripCities.length - 1 && (
                              <div className="flex-shrink-0">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                </svg>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-500 text-sm">
                        Multi-city trip ({trip.total_cities} cities)
                      </div>
                    )}
                  </div>
                )}

                {/* Group Members */}
                <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Group Members</h3>
                  <div className="space-y-2 sm:space-y-3">
                    {(trip.members || trip.trip_members || [])
                      .filter(member => member.status === 'active' || !member.status) // Filter for active members
                      .map(member => (
                      <div key={member.id || member.user_id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                          <Image
                            src={member.avatar || member.user?.avatar_url || '/profile-icon.png'}
                            alt={member.name || member.user?.name || 'Member'}
                            width={28}
                            height={28}
                            className="rounded-full sm:w-8 sm:h-8"
                          />
                          <span className="text-gray-900 text-sm sm:text-base truncate">
                            {member.name || member.user?.name || 'Anonymous'}
                          </span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getStatusColor(member.role)}`}>
                          {member.role}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  {((trip.trip_members?.filter(m => m.status === 'active' || !m.status).length || trip.members?.filter(m => m.status === 'active' || !m.status).length || 0) < (trip.max_members || trip.maxMembers || 999)) && isMember && (
                    <button
                      onClick={() => {
                        setInitialSettingsTab('invites');
                        setShowSettings(true);
                      }}
                      className="w-full mt-3 sm:mt-4 bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      Invite Members
                    </button>
                  )}
                  
                  {!isMember && (trip.visibility === 'public' || trip.visibility === 'link') && (
                    <div className="w-full mt-3 sm:mt-4">
                      {wasRemoved && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <div className="flex items-center">
                            <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-medium text-red-800">Removed from Trip</span>
                          </div>
                          <p className="text-sm text-red-700 mt-1">
                            You have been removed from this trip by an administrator.
                          </p>
                        </div>
                      )}
                      
                      {!wasRemoved && joinRequestStatus === 'requested' && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <div className="flex items-center">
                            <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-medium text-yellow-800">Request Pending</span>
                          </div>
                          <p className="text-sm text-yellow-700 mt-1">
                            Your join request is being reviewed by the trip administrators.
                          </p>
                        </div>
                      )}
                      
                      {!wasRemoved && joinRequestStatus === 'rejected' && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <div className="flex items-center">
                            <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-medium text-red-800">Request Rejected</span>
                          </div>
                          <p className="text-sm text-red-700 mt-1">
                            Your join request was rejected{joinRequestData?.reviewedAt ? ` on ${formatDate(joinRequestData.reviewedAt)}` : ''}.
                          </p>
                          {joinRequestData?.reviewMessage && (
                            <div className="mt-2 p-2 bg-red-100 rounded text-sm text-red-800">
                              <strong>Reason:</strong> {joinRequestData.reviewMessage}
                            </div>
                          )}
                          <button
                            onClick={() => {
                              setJoinRequestStatus(null);
                              setJoinRequestData(null);
                            }}
                            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                          >
                            Request to join again
                          </button>
                        </div>
                      )}
                      
                      {!wasRemoved && joinRequestStatus === 'approved' && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="flex items-center">
                            <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-medium text-green-800">Request Approved</span>
                          </div>
                          <p className="text-sm text-green-700 mt-1">
                            Your join request has been approved! You should now see the trip in your dashboard.
                          </p>
                        </div>
                      )}
                      
                      {!wasRemoved && !joinRequestStatus && (
                        trip.auto_approve_requests ? (
                          <button
                            onClick={handleDirectJoin}
                            disabled={isJoining}
                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isJoining ? 'Joining...' : 'Join Now'}
                          </button>
                        ) : (
                          <button
                            onClick={() => setShowJoinRequestModal(true)}
                            disabled={isRequesting}
                            className="w-full bg-green-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Request to Join
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
                
                {/* Join Requests Management - Only for Admins/Managers */}
                {canManageRequests && (
                  <JoinRequestsManager 
                    trip={trip} 
                    onMemberAdded={(newMember) => {
                      // Update trip member count and list
                      onTripUpdated({
                        ...trip,
                        current_members: (trip.current_members || 0) + 1,
                        members: [...(trip.members || []), newMember]
                      });
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        );
        
      case 'itinerary':
        return <Itinerary trip={trip} canEdit={canEdit} />;
        
      case 'expenses':
        return <ExpenseManager trip={trip} />;
        
      case 'chat':
        return <TripChat trip={trip} />;
        
      case 'ai':
        return <TripAIHelper trip={trip} />;
        
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3 sm:gap-4">
        <div className="flex items-center space-x-4">
          <a
            href="/dashboard"
            className="text-gray-600 hover:text-gray-800 flex items-center text-sm sm:text-base"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </a>
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-3">
          {isAdmin && (
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center bg-white text-gray-700 px-3 py-2 rounded-lg shadow-sm hover:bg-gray-50 border border-gray-200 transition-colors text-sm sm:text-base"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6 sm:mb-8">
        <nav className="flex space-x-4 sm:space-x-8 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-1 sm:space-x-2 py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {renderTabIcon(tab.icon)}
              <span className="hidden sm:inline">{tab.name}</span>
              <span className="sm:hidden">{tab.name.split(' ')[0]}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {renderTabContent()}

      {/* Modals */}
      {showSettings && (
        <TripSettings
          trip={trip}
          onClose={() => {
            setShowSettings(false);
            setInitialSettingsTab('general'); // Reset for next time
          }}
          onTripUpdated={onTripUpdated}
          onMembersUpdated={() => {
            // Refresh trip data to update member count
            if (onTripUpdated) {
              onTripUpdated();
            }
          }}
          initialTab={initialSettingsTab}
        />
      )}
      
      {showInviteModal && (
        <InviteLinkModal
          trip={trip}
          onClose={() => setShowInviteModal(false)}
        />
      )}
      
      {showJoinRequestModal && (
        <JoinRequestModal
          isOpen={showJoinRequestModal}
          onClose={() => setShowJoinRequestModal(false)}
          onSubmit={handleJoinTrip}
          isLoading={isRequesting}
        />
      )}
    </div>
  );
}
