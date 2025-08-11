"use client";
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { tripApi } from '../../lib/api';
import { useUser } from '../../contexts/UserContext';
import TripCreateWizard from './_components/TripCreateWizard';
import TripView from './_components/TripView';

function TripPageContent() {
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useUser();
  const mode = searchParams.get('mode'); // 'create' for creation mode
  const tripId = searchParams.get('id'); // trip ID for viewing/editing
  
  const [currentTrip, setCurrentTrip] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // If we have a trip ID, fetch the trip data
    if (tripId) {
      fetchTripData(tripId);
    }
  }, [tripId]);

  const fetchTripData = async (id) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await tripApi.getTripById(id);
      
      if (response.success) {
        setCurrentTrip(response.data);
      } else {
        setError(response.error || 'Failed to load trip');
      }
    } catch (err) {
      setError('Error loading trip. Please try again.');
      console.error('Error fetching trip:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTripCreated = (newTrip) => {
    setCurrentTrip(newTrip);
    // Update URL to remove create mode and add trip ID
    window.history.replaceState({}, '', `/trip?id=${newTrip.id}`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading trip...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => tripId ? fetchTripData(tripId) : window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Authentication check for create mode
  if (mode === 'create' && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please log in to create a trip</p>
          <a 
            href="/auth"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Log In
          </a>
        </div>
      </div>
    );
  }

  // Create mode
  if (mode === 'create' && !currentTrip) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 sm:pt-20">
        <TripCreateWizard onTripCreated={handleTripCreated} />
      </div>
    );
  }

  // View/Edit mode
  if (currentTrip) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 sm:pt-20">
        <TripView trip={currentTrip} onTripUpdated={setCurrentTrip} />
      </div>
    );
  }

  // Default state - no trip ID provided and not in create mode
  return (
    <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">No trip selected</h2>
        <p className="text-gray-600 mb-6">Choose a trip to view or create a new one</p>
        <div className="space-x-4">
          <a 
            href="/explore"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Explore Trips
          </a>
          <a 
            href="/trip?mode=create"
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Create Trip
          </a>
        </div>
      </div>
    </div>
  );
}

// Loading component for Suspense fallback
function TripPageLoading() {
  return (
    <div className="min-h-screen bg-gray-50 pt-16 sm:pt-20">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-96 mb-8"></div>
          <div className="space-y-4">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main export with Suspense wrapper
export default function TripPage() {
  return (
    <Suspense fallback={<TripPageLoading />}>
      <TripPageContent />
    </Suspense>
  );
}
