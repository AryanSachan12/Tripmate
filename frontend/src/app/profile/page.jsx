"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useUser } from "../../contexts/UserContext";
import { userApi } from "../../lib/api";
import { supabase } from "../../lib/supabase";

export default function Profile() {
  const { user, updateProfile, loading } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);
  const [userTrips, setUserTrips] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  // Initialize profile data from user context
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    location: "",
    bio: "",
    profilePicture: "/profile-icon.png",
    travelPreferences: {
      budget: "mid-range",
      travelStyle: "adventure",
      accommodation: "hotels",
      transportation: "flights"
    }
  });

  // Update profile data when user context loads
  useEffect(() => {
    console.log('User from context:', user);
    console.log('User profile:', user?.profile);
    console.log('Loading state:', loading);
    
    if (user && user.profile) {
      const profile = user.profile;
      console.log('Loading profile data:', profile);
      setProfileData({
        firstName: profile.first_name || "",
        lastName: profile.last_name || "",
        email: user.email || profile.email || "",
        phone: profile.phone || "",
        dateOfBirth: profile.date_of_birth || "",
        location: profile.location || "",
        bio: profile.bio || "",
        profilePicture: profile.avatar_url || user.avatar || "/profile-icon.png",
        travelPreferences: profile.preferences || {
          budget: "mid-range",
          travelStyle: "adventure",
          accommodation: "hotels",
          transportation: "flights"
        }
      });
      console.log('Date of birth from profile:', profile.date_of_birth);
    } else if (user) {
      // Fallback if no profile data
      const [firstName, ...lastNameParts] = (user.name || "").split(" ");
      setProfileData({
        firstName: firstName || "",
        lastName: lastNameParts.join(" ") || "",
        email: user.email || "",
        phone: user.phone || "",
        dateOfBirth: "",
        location: user.location || "",
        bio: user.bio || "",
        profilePicture: user.avatar_url || "/profile-icon.png",
        travelPreferences: user.preferences || {
          budget: "mid-range",
          travelStyle: "adventure",
          accommodation: "hotels",
          transportation: "flights"
        }
      });
    }
  }, [user]);

  // Fetch user trips to calculate places visited
  useEffect(() => {
    const fetchUserTrips = async () => {
      if (user && !loading) {
        try {
          setTripsLoading(true);
          const response = await userApi.getUserTrips(); // Use same params as dashboard
          if (response.success) {
            setUserTrips(response.data.trips || []);
          }
        } catch (error) {
          console.error('Error fetching user trips:', error);
        } finally {
          setTripsLoading(false);
        }
      }
    };

    fetchUserTrips();
  }, [user, loading]);

  // Calculate stats dynamically based on user trips
  const stats = {
    tripsCompleted: userTrips.filter(trip => trip.status === 'completed').length,
    placesVisited: [...new Set(userTrips.map(trip => trip.location).filter(Boolean))].length,
    upcomingTrips: userTrips.filter(trip => trip.status === 'planning' || trip.status === 'active' || trip.status === 'upcoming' || (!trip.status)).length
  };

  // Get recent trips (last 3 trips, sorted by date)
  const recentTrips = userTrips
    .slice()
    .sort((a, b) => new Date(b.created_at || b.start_date) - new Date(a.created_at || a.start_date))
    .slice(0, 3)
    .map(trip => ({
      id: trip.id,
      title: trip.title,
      date: trip.start_date ? new Date(trip.start_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Date TBA',
      duration: trip.start_date && trip.end_date ? 
        `${Math.ceil((new Date(trip.end_date) - new Date(trip.start_date)) / (1000 * 60 * 60 * 24))} days` : 
        'Duration TBA',
      image: trip.cover_image_url || "/logo.png",
      status: trip.status || 'planning'
    }));

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setProfileData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setProfileData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleAvatarUpdated = (updatedUser) => {
    // Update the profile data with the new avatar URL
    setProfileData(prev => ({
      ...prev,
      profilePicture: updatedUser.avatar_url || '/profile-icon.png'
    }));
    setShowAvatarUpload(false);
  };

  const handleAvatarUpload = async (file) => {
    try {
      setUploadingAvatar(true);
      
      // Get the current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        alert('Please log in to upload an avatar');
        return;
      }
      
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await fetch('/api/upload/avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Update the profile data with new avatar
        setProfileData(prev => ({
          ...prev,
          profilePicture: result.data.avatarUrl
        }));
        
        // Update the user context as well
        if (updateProfile) {
          await updateProfile({ avatar_url: result.data.avatarUrl });
        }
        
        setShowAvatarUpload(false);
        alert('Avatar updated successfully!');
      } else {
        alert(`Error uploading avatar: ${result.error}`);
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Failed to upload avatar. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    try {
      // Prepare the update data to match the API format
      const updates = {
        first_name: profileData.firstName,
        last_name: profileData.lastName,
        name: `${profileData.firstName} ${profileData.lastName}`.trim(),
        phone: profileData.phone,
        date_of_birth: profileData.dateOfBirth,
        location: profileData.location,
        bio: profileData.bio,
        preferences: profileData.travelPreferences
      };

      console.log('Saving profile with updates:', updates);

      const result = await updateProfile(updates);
      
      if (result.success) {
        // The UserContext will automatically update, and the useEffect will sync
        // the profileData state with the updated user data
        setIsEditing(false);
        alert('Profile updated successfully!');
      } else {
        alert(`Error updating profile: ${result.error}`);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to update profile. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-16 sm:pt-20">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
            {/* Profile Picture */}
            <div className="relative">
              <Image
                src={profileData.profilePicture}
                alt="Profile"
                width={120}
                height={120}
                className="rounded-full border-4 border-white shadow-lg object-cover"
                onError={(e) => {
                  console.log('Profile avatar failed to load:', e.target.src);
                  e.target.src = "/profile-icon.png";
                }}
              />
              {isEditing && (
                <button 
                  onClick={() => setShowAvatarUpload(true)}
                  className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center sm:text-left w-full">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-4 gap-4">
                <div className="flex-1">
                  {isEditing ? (
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-2">
                      <input
                        type="text"
                        value={profileData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        className="text-xl sm:text-2xl font-bold bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-center sm:text-left focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="First Name"
                      />
                      <input
                        type="text"
                        value={profileData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        className="text-xl sm:text-2xl font-bold bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-center sm:text-left focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Last Name"
                      />
                    </div>
                  ) : (
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                      {profileData.firstName} {profileData.lastName}
                    </h1>
                  )}
                  
                  {isEditing ? (
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full max-w-md text-gray-600 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 mb-2 text-center sm:text-left focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-600 mb-2 text-sm sm:text-base">{profileData.email}</p>
                  )}
                  
                  <div className="flex items-center justify-center sm:justify-start text-gray-500 text-sm sm:text-base">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {isEditing ? (
                      <input
                        type="text"
                        value={profileData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-center sm:text-left max-w-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Location"
                      />
                    ) : (
                      <span>{profileData.location}</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:items-center lg:flex-shrink-0">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-5 py-2.5 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md flex items-center justify-center gap-2 min-w-[120px]"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 text-sm font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2 min-w-[140px]"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Save Changes
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 text-sm font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2 min-w-[140px]"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit Profile
                    </button>
                  )}
                </div>
              </div>

              {/* Bio */}
              <div className="mb-4">
                {isEditing ? (
                  <textarea
                    value={profileData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 h-20 resize-none text-sm sm:text-base"
                    placeholder="Tell us about yourself..."
                  />
                ) : (
                  <p className="text-gray-700 text-sm sm:text-base text-center sm:text-left">{profileData.bio}</p>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                <div className="text-center bg-blue-50 rounded-lg p-3 sm:p-4">
                  <div className="text-xl sm:text-2xl font-bold text-blue-600">{stats.upcomingTrips}</div>
                  <div className="text-xs sm:text-sm text-gray-500">Upcoming Trips</div>
                </div>
                <div className="text-center bg-green-50 rounded-lg p-3 sm:p-4">
                  <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.tripsCompleted}</div>
                  <div className="text-xs sm:text-sm text-gray-500">Trips Completed</div>
                </div>
                <div className="text-center bg-purple-50 rounded-lg p-3 sm:p-4">
                  <div className="text-xl sm:text-2xl font-bold text-purple-600">{stats.placesVisited}</div>
                  <div className="text-xs sm:text-sm text-gray-500">Places Visited</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Personal Information */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">Personal Information</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2"
                    />
                  ) : (
                    <p className="text-gray-900">{profileData.phone}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={profileData.dateOfBirth}
                      onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {profileData.dateOfBirth ? 
                        new Date(profileData.dateOfBirth).toLocaleDateString() : 
                        'Not set'
                      }
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Travel Preferences */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">Travel Preferences</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Budget Range</label>
                  {isEditing ? (
                    <select
                      value={profileData.travelPreferences.budget}
                      onChange={(e) => handleInputChange('travelPreferences.budget', e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="budget">Budget (Under $100/day)</option>
                      <option value="mid-range">Mid-range ($100-300/day)</option>
                      <option value="luxury">Luxury ($300+/day)</option>
                    </select>
                  ) : (
                    <p className="text-gray-900 capitalize">{profileData.travelPreferences.budget}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Travel Style</label>
                  {isEditing ? (
                    <select
                      value={profileData.travelPreferences.travelStyle}
                      onChange={(e) => handleInputChange('travelPreferences.travelStyle', e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="adventure">Adventure</option>
                      <option value="relaxation">Relaxation</option>
                      <option value="cultural">Cultural</option>
                      <option value="business">Business</option>
                    </select>
                  ) : (
                    <p className="text-gray-900 capitalize">{profileData.travelPreferences.travelStyle}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Accommodation</label>
                  {isEditing ? (
                    <select
                      value={profileData.travelPreferences.accommodation}
                      onChange={(e) => handleInputChange('travelPreferences.accommodation', e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="hotels">Hotels</option>
                      <option value="hostels">Hostels</option>
                      <option value="airbnb">Airbnb</option>
                      <option value="resorts">Resorts</option>
                    </select>
                  ) : (
                    <p className="text-gray-900 capitalize">{profileData.travelPreferences.accommodation}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Transportation</label>
                  {isEditing ? (
                    <select
                      value={profileData.travelPreferences.transportation}
                      onChange={(e) => handleInputChange('travelPreferences.transportation', e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="flights">Flights</option>
                      <option value="trains">Trains</option>
                      <option value="buses">Buses</option>
                      <option value="car-rental">Car Rental</option>
                    </select>
                  ) : (
                    <p className="text-gray-900 capitalize">{profileData.travelPreferences.transportation}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Trips */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">Recent Trips</h2>
              
              <div className="space-y-3 sm:space-y-4">
                {recentTrips.length > 0 ? (
                  recentTrips.map((trip) => (
                    <div key={trip.id} className="flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
                      <Image
                        src={trip.image}
                        alt={trip.title}
                        width={40}
                        height={40}
                        className="rounded-lg sm:w-12 sm:h-12 object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 text-sm sm:text-base truncate">{trip.title}</h3>
                        <p className="text-xs sm:text-sm text-gray-500">{trip.date}</p>
                        <p className="text-xs text-gray-400">{trip.duration}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full flex-shrink-0 ${
                        trip.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                        trip.status === 'active' ? 'bg-green-100 text-green-800' :
                        trip.status === 'planning' ? 'bg-blue-100 text-blue-800' :
                        trip.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        trip.status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-600 mb-2">No trips yet</p>
                    <p className="text-sm text-gray-500">Start planning your first adventure!</p>
                  </div>
                )}
              </div>
              
              {recentTrips.length > 0 && (
                <Link href="/dashboard" className="w-full mt-4 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm sm:text-base block text-center">
                  View All Trips
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Avatar Upload Modal */}
      {showAvatarUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Update Profile Picture</h3>
              <button
                onClick={() => setShowAvatarUpload(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={uploadingAvatar}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="text-center py-4">
              <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                <Image
                  src={profileData.profilePicture}
                  alt="Current Avatar"
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-gray-600 mb-4">Choose a new profile picture</p>
              
              {uploadingAvatar ? (
                <div className="py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">Uploading...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        handleAvatarUpload(file);
                      }
                    }}
                    className="hidden"
                    id="avatar-upload"
                  />
                  <label
                    htmlFor="avatar-upload"
                    className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    Choose File
                  </label>
                  <p className="text-xs text-gray-500">
                    Supported formats: JPG, PNG, WebP (max 5MB)
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAvatarUpload(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={uploadingAvatar}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
