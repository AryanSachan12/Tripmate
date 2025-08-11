"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useUser } from '../../contexts/UserContext';
import { userApi, notificationsApi } from '../../lib/api';

export default function DashboardPage() {
  const { user, loading } = useUser();
  const [userTrips, setUserTrips] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [notificationsLoading, setNotificationsLoading] = useState(true);

  useEffect(() => {
    if (user && !loading) {
      loadUserTrips();
      loadNotifications();
    }
  }, [user, loading]);

  const loadUserTrips = async () => {
    try {
      setTripsLoading(true);
      console.log('Loading user trips...');
      const response = await userApi.getUserTrips();
      console.log('User trips response:', response);
      
      if (response.success) {
        setUserTrips(response.data.trips || []);
        console.log('User trips loaded:', response.data.trips?.length || 0, 'trips');
      } else {
        console.error('Failed to load trips:', response.error);
      }
    } catch (error) {
      console.error('Error loading user trips:', error);
    } finally {
      setTripsLoading(false);
    }
  };

  const loadNotifications = async () => {
    try {
      setNotificationsLoading(true);
      console.log('Loading notifications...');
      const response = await notificationsApi.getNotifications();
      console.log('Notifications response:', response);
      
      if (response.success) {
        setNotifications(response.data.notifications || []);
        console.log('Notifications loaded:', response.data.notifications?.length || 0, 'notifications');
      } else {
        console.error('Failed to load notifications:', response.error);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'planning': return 'bg-blue-100 text-blue-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      // Legacy status support
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'Admin': return 'bg-purple-100 text-purple-800';
      case 'Manager': return 'bg-blue-100 text-blue-800';
      case 'Traveller': return 'bg-green-100 text-green-800';
      case 'Requested': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please log in to view your dashboard</h2>
          <Link href="/auth" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
            Log In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16 sm:pt-20">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        {/* Welcome Header */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <Image
                src={user?.profile?.avatar_url || user?.user_metadata?.avatar_url || "/profile-icon.png"}
                alt={user?.profile?.name || user?.user_metadata?.name || "User"}
                width={48}
                height={48}
                className="sm:w-16 sm:h-16 rounded-full"
                onError={(e) => {
                  console.log('Dashboard avatar failed to load:', e.target.src);
                  e.target.src = "/profile-icon.png";
                }}
              />
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                  Welcome back, {user?.profile?.name || user?.user_metadata?.name || "User"}!
                </h1>
                <p className="text-sm sm:text-base text-gray-600">Ready for your next adventure?</p>
              </div>
            </div>
            <Link
              href="/trip?mode=create"
              className="w-full sm:w-auto bg-blue-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors text-center text-sm sm:text-base"
            >
              Create New Trip
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6">
              <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-sm">
                <div className="flex items-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">
                      {userTrips.filter(trip => trip.status === 'planning' || trip.status === 'upcoming' || trip.status === 'pending' || (!trip.status)).length}
                    </p>
                    <p className="text-sm sm:text-base text-gray-600">Upcoming Trips</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-sm">
                <div className="flex items-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">
                      {userTrips.filter(trip => trip.status === 'completed').length}
                    </p>
                    <p className="text-sm sm:text-base text-gray-600">Completed Trips</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-sm">
                <div className="flex items-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">
                      {[...new Set(userTrips.map(trip => trip.location).filter(Boolean))].length}
                    </p>
                    <p className="text-sm sm:text-base text-gray-600">Places Visited</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Your Trips */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Your Trips</h2>
                <Link
                  href="/explore"
                  className="text-blue-600 hover:text-blue-500 font-medium"
                >
                  Explore More Trips
                </Link>
              </div>

              <div className="space-y-4">
                {tripsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading your trips...</p>
                  </div>
                ) : userTrips.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-4">You haven't joined any trips yet.</p>
                    <Link 
                      href="/explore"
                      className="text-blue-600 hover:text-blue-500 font-medium"
                    >
                      Explore available trips →
                    </Link>
                  </div>
                ) : (
                  userTrips.map(trip => (
                    <div key={trip.id} className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <Image
                            src={trip.cover_image_url || "/logo.png"}
                            alt={trip.title}
                            width={64}
                            height={64}
                            className="rounded-lg object-cover"
                          />
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{trip.title}</h3>
                            <p className="text-gray-600">{trip.destination}</p>
                            <p className="text-sm text-gray-500">
                              {trip.start_date && trip.end_date 
                                ? `${new Date(trip.start_date).toLocaleDateString()} - ${new Date(trip.end_date).toLocaleDateString()}`
                                : 'Dates TBA'
                              }
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 text-right">
                          <div className="flex flex-col space-y-1">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(trip.status || 'planning')}`}>
                              {(trip.status || 'planning').charAt(0).toUpperCase() + (trip.status || 'planning').slice(1)}
                            </span>
                            <span className={`px-4 py-1 rounded-full text-xs font-medium ${getRoleColor(trip.userRole || trip.memberRole || 'Traveller')}`}>
                              {trip.userRole || trip.memberRole || 'Traveller'}
                            </span>
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-sm text-gray-600">{trip.member_count || 0}/{trip.max_members || 'N/A'} members</p>
                            <Link
                              href={`/trip?id=${trip.id}`}
                              className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                            >
                              View Trip →
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Notifications */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {notifications.map(notification => (
                  <div key={notification.id} className={`p-3 rounded-lg ${notification.unread ? 'bg-blue-50 border-l-4 border-blue-500' : 'bg-gray-50'}`}>
                    <p className="text-sm text-gray-900">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                  </div>
                ))}
              </div>
              <Link
                href="/notifications"
                className="block text-center text-blue-600 hover:text-blue-500 font-medium mt-4"
              >
                View All Notifications
              </Link>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link
                  href="/trip?mode=create"
                  className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <span className="text-gray-900 font-medium">Create New Trip</span>
                </Link>
                
                <Link
                  href="/explore"
                  className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <span className="text-gray-900 font-medium">Explore Trips</span>
                </Link>
                
                <Link
                  href="/destinations"
                  className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <span className="text-gray-900 font-medium">View Destinations</span>
                </Link>
                
                <Link
                  href="/profile"
                  className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <span className="text-gray-900 font-medium">Edit Profile</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
