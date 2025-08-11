"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { tripApi } from '../../lib/api';
import { getStatusColor } from '../../lib/utils';

export default function ExplorePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({
    location: '',
    dateRange: '',
    budget: '',
    tags: []
  });
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTrips();
  }, [selectedFilters]);

  const loadTrips = async () => {
    try {
      setLoading(true);
      setError('');
      
      const filters = {};
      if (selectedFilters.location) filters.destination = selectedFilters.location;
      if (selectedFilters.budget) filters.budget = selectedFilters.budget;
      if (selectedFilters.tags.length > 0) filters.tags = selectedFilters.tags;
      
      const response = await tripApi.getTrips(filters);
      
      if (response.success) {
        setTrips(response.data.trips || []);
      } else {
        setError(response.error || 'Failed to load trips');
      }
    } catch (err) {
      setError('Error loading trips. Please try again.');
      console.error('Error loading trips:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterTags = ["Adventure", "Beach", "Mountains", "Culture", "Party", "Nature", "Trekking", "Peaceful", "Relaxation"];

  const handleTagToggle = (tag) => {
    setSelectedFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) 
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const filteredTrips = trips.filter(trip => {
    const matchesSearch = trip.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (trip.location || trip.destination)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         trip.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTags = selectedFilters.tags.length === 0 || 
                       selectedFilters.tags.some(tag => trip.tags?.includes(tag));
    
    return matchesSearch && matchesTags;
  });

  return (
    <div className="min-h-screen bg-gray-50 pt-16 sm:pt-20">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        {/* Hero Section */}
        <div className="relative mb-8 sm:mb-12">
          <div className="relative h-64 sm:h-80 lg:h-96 rounded-2xl sm:rounded-3xl overflow-hidden">
            {/* Hero Image */}
            <Image 
              src="/hero.png" 
              alt="Hero Image" 
              fill
              className="object-cover"
              priority
            />
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/20"></div>
            
            {/* Content Overlay */}
            <div className="absolute inset-0 flex flex-col justify-center items-start p-6 sm:p-8 lg:p-12">
              <div className="max-w-2xl">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-4 sm:mb-6 leading-tight">
                  Explore Trips
                </h1>
                <p className="text-lg sm:text-xl lg:text-2xl text-white/90 mb-6 sm:mb-8 leading-relaxed">
                  Discover amazing group adventures and connect with fellow travelers
                </p>
                
                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg transition-all duration-200 shadow-lg hover:shadow-xl">
                    Start Exploring
                  </button>
                  <button className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border border-white/30 px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg transition-all duration-200">
                    Create Trip
                  </button>
                </div>
              </div>
            </div>
            
            {/* Bottom Fade for smooth transition */}
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-50 to-transparent"></div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col gap-4 sm:gap-6">
            {/* Search */}
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Trips</label>
              <input
                type="text"
                placeholder="Search by destination, title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              />
            </div>
            
            {/* Filters Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Location Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <select
                  value={selectedFilters.location}
                  onChange={(e) => setSelectedFilters(prev => ({...prev, location: e.target.value}))}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                >
                  <option value="">All Locations</option>
                  <option value="himachal">Himachal Pradesh</option>
                  <option value="goa">Goa</option>
                  <option value="kerala">Kerala</option>
                  <option value="rajasthan">Rajasthan</option>
                </select>
              </div>

              {/* Budget Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Budget Range</label>
                <select
                  value={selectedFilters.budget}
                  onChange={(e) => setSelectedFilters(prev => ({...prev, budget: e.target.value}))}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                >
                  <option value="">Any Budget</option>
                  <option value="low">Under ₹10,000</option>
                  <option value="medium">₹10,000 - ₹20,000</option>
                  <option value="high">Above ₹20,000</option>
                </select>
              </div>
            </div>

            {/* Tag Filters */}
            <div className="mt-4 sm:mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Trip Tags</label>
              <div className="flex flex-wrap gap-2">
                {filterTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => handleTagToggle(tag)}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                      selectedFilters.tags.includes(tag)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="mb-4 sm:mb-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading trips...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <button 
                onClick={loadTrips}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : (
            <p className="text-sm sm:text-base text-gray-600">
              {filteredTrips.length} {filteredTrips.length === 1 ? 'trip' : 'trips'} found
            </p>
          )}
        </div>

        {/* Trip Cards Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredTrips.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No trips found</h3>
                <p className="text-gray-500">Try adjusting your search or filters to see more results.</p>
              </div>
            ) : (
              filteredTrips.map(trip => (
                <div key={trip.id} className="bg-white rounded-xl sm:rounded-2xl shadow-sm hover:shadow-lg transition-shadow overflow-hidden">
                  <div className="relative h-40 sm:h-48">
                    <Image
                      src={trip.cover_image_url || "/logo.png"}
                      alt={trip.title}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-3 sm:top-4 left-3 sm:left-4">
                      <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${getStatusColor(trip.status)}`}>
                        {trip.status ? trip.status.charAt(0).toUpperCase() + trip.status.slice(1) : 'Unknown'}
                      </span>
                    </div>
                    <div className="absolute top-3 sm:top-4 right-3 sm:right-4">
                      <span className="bg-white/90 backdrop-blur-sm px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium text-gray-700">
                        {trip.member_count || 0}/{trip.max_members || 'N/A'} members
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-4 sm:p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-900 line-clamp-2 flex-1 mr-2">{trip.title}</h3>
                      <span className="text-base sm:text-lg font-bold text-blue-600 flex-shrink-0">
                        {trip.budget ? `₹${trip.budget}` : 'Budget TBA'}
                      </span>
                    </div>
                    
                    <p className="text-sm sm:text-base text-gray-600 mb-3 line-clamp-2">{trip.description}</p>
                    
                    <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
                      <div className="flex items-center text-xs sm:text-sm text-gray-500">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="truncate">{trip.location || trip.destination}</span>
                      </div>
                      <div className="flex items-center text-xs sm:text-sm text-gray-500">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="truncate">
                          {trip.start_date && trip.end_date 
                            ? `${new Date(trip.start_date).toLocaleDateString()} - ${new Date(trip.end_date).toLocaleDateString()}`
                            : 'Dates TBA'
                          }
                        </span>
                      </div>
                      <div className="flex items-center text-xs sm:text-sm text-gray-500">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="truncate">Hosted by {trip.host_name || 'Unknown'}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 sm:gap-1.5 mb-3 sm:mb-4">
                      {trip.tags?.slice(0, 3).map(tag => (
                        <span key={tag} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                          {tag}
                        </span>
                      ))}
                      {trip.tags?.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          +{trip.tags.length - 3} more
                        </span>
                      )}
                    </div>
                    
                    <Link
                      href={`/trip?id=${trip.id}`}
                      className="block w-full bg-blue-600 text-white py-2 sm:py-2.5 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors text-center text-sm sm:text-base"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
