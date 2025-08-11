"use client";
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '../../../lib/supabase';
import ItineraryComments from './ItineraryComments';

export default function Itinerary({ trip, canEdit }) {
  const [itinerary, setItinerary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverDay, setDragOverDay] = useState(null);
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    time: '',
    location: '',
    day: 1,
    duration_minutes: '',
    cost_estimate: '',
    booking_url: '',
    notes: ''
  });
  const [showAIGenerateModal, setShowAIGenerateModal] = useState(false);
  const [aiInstructions, setAiInstructions] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [selectedItemForComments, setSelectedItemForComments] = useState(null);
  const [commentCounts, setCommentCounts] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());

  // Helper function to highlight search terms
  const highlightSearchTerm = (text, searchTerm) => {
    if (!searchTerm || !text) return text;
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="bg-yellow-200 px-1 rounded">
          {part}
        </span>
      ) : part
    );
  };

  // Calendar helper functions
  const getCalendarDays = (year, month) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for previous month days
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getItemsForDate = (date) => {
    if (!date || !trip.start_date) return [];
    
    const tripStart = new Date(trip.start_date);
    
    // Normalize both dates to avoid timezone issues
    const normalizedTripStart = new Date(tripStart.getFullYear(), tripStart.getMonth(), tripStart.getDate());
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    // Calculate the difference in days
    const diffTime = normalizedDate.getTime() - normalizedTripStart.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Day number starts from 1 for the start date, so:
    // Start date (diffDays = 0) should be Day 1
    // Next date (diffDays = 1) should be Day 2, etc.
    const dayNumber = diffDays + 1;
    
    // Only return items if the day number is valid (positive and within trip duration)
    if (dayNumber < 1 || dayNumber > getTripDuration()) {
      return [];
    }
    
    const dayItems = groupedItinerary[dayNumber] || [];
    
    // Filter by search term if active
    if (searchTerm) {
      return dayItems.filter(item => 
        item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return dayItems;
  };

  const isDateInTripRange = (date) => {
    if (!trip.start_date || !trip.end_date || !date) return false;
    
    const tripStart = new Date(trip.start_date);
    const tripEnd = new Date(trip.end_date);
    
    // Normalize all dates to avoid timezone issues
    const normalizedTripStart = new Date(tripStart.getFullYear(), tripStart.getMonth(), tripStart.getDate());
    const normalizedTripEnd = new Date(tripEnd.getFullYear(), tripEnd.getMonth(), tripEnd.getDate());
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const isInRange = normalizedDate >= normalizedTripStart && normalizedDate <= normalizedTripEnd;
    
    return isInRange;
  };

  const navigateCalendar = (direction) => {
    setCurrentCalendarMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  // Check if itinerary is locked based on trip settings and dates
  const isItineraryLocked = () => {
    if (!trip.is_locked) return false;
    
    if (!trip.start_date) return false;
    
    const today = new Date();
    const startDate = new Date(trip.start_date);
    const lockDaysBefore = trip.lock_days_before || 3;
    
    // Calculate the lock date (X days before start date)
    const lockDate = new Date(startDate);
    lockDate.setDate(lockDate.getDate() - lockDaysBefore);
    
    // If today is on or after the lock date, the itinerary is locked
    return today >= lockDate;
  };

  // Check if user can edit (has permission AND itinerary is not locked)
  const canEditItinerary = canEdit && !isItineraryLocked();

  // Helper function to get auth token
  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  // Load itinerary data from backend
  useEffect(() => {
    if (trip?.id) {
      loadItinerary();
      
      // Set calendar to start with trip start date if available
      if (trip.start_date) {
        setCurrentCalendarMonth(new Date(trip.start_date));
      }
    }
  }, [trip?.id, trip?.start_date]);

  const loadItinerary = async () => {
    try {
      setLoading(true);
      console.log('Loading itinerary for trip:', trip.id);
      
      const token = await getAuthToken();
      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/trips/${trip.id}/itinerary`, {
        headers
      });
      
      console.log('Itinerary response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Itinerary data received:', data);
        console.log('Individual items:', data.itinerary?.map(item => ({
          id: item.id,
          title: item.title,
          day: item.day,
          date: item.date,
          time: item.time
        })));
        setItinerary(data.itinerary || []);
      } else {
        const errorData = await response.json();
        console.error('Failed to load itinerary:', errorData);
        alert(`Failed to load itinerary: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error loading itinerary:', error);
      alert('Error loading itinerary. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    try {
      const token = await getAuthToken();
      const headers = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/trips/${trip.id}/itinerary`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...newItem,
          date: getDateForDay(newItem.day)
        })
      });

      if (response.ok) {
        const data = await response.json();
        setItinerary(prev => [...prev, data.item].sort((a, b) => a.day - b.day));
        setNewItem({ title: '', description: '', time: '', location: '', day: 1, duration_minutes: '', cost_estimate: '', booking_url: '', notes: '' });
        setShowAddForm(false);
      } else {
        const errorData = await response.json();
        console.error('Failed to add itinerary item:', errorData);
        alert(`Failed to add item: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error adding itinerary item:', error);
      alert('Error adding itinerary item. Please try again.');
    }
  };

  const handleUpdateItem = async () => {
    try {
      const token = await getAuthToken();
      const headers = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/trips/${trip.id}/itinerary/${editingItem.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          ...newItem,
          date: getDateForDay(newItem.day)
        })
      });

      if (response.ok) {
        const data = await response.json();
        setItinerary(prev => 
          prev.map(item => 
            item.id === editingItem.id ? data.item : item
          ).sort((a, b) => a.day - b.day)
        );
        setEditingItem(null);
        setNewItem({ title: '', description: '', time: '', location: '', day: 1, duration_minutes: '', cost_estimate: '', booking_url: '', notes: '' });
        setShowAddForm(false);
      } else {
        const errorData = await response.json();
        console.error('Failed to update itinerary item:', errorData);
        alert(`Failed to update item: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating itinerary item:', error);
      alert('Error updating itinerary item. Please try again.');
    }
  };

  const handleGenerateWithAI = async () => {
    if (!trip.start_date || !trip.end_date) {
      alert('Please set trip start and end dates before generating an itinerary.');
      return;
    }

    if (!confirm('This will generate a new itinerary with AI. Any existing items will remain. Continue?')) {
      return;
    }

    try {
      setIsGeneratingAI(true);
      
      const token = await getAuthToken();
      const headers = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // Prepare trip context for AI
      const tripContext = {
        id: trip.id,
        title: trip.title,
        location: trip.location,
        startDate: trip.start_date,
        endDate: trip.end_date,
        description: trip.description,
        budget: trip.budget,
        members: trip.members || []
      };

      const response = await fetch('/api/ai/generate-itinerary', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tripContext,
          userInstructions: aiInstructions.trim() || undefined
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Success! Generated ${data.itemCount} new itinerary items. Refreshing...`);
        setShowAIGenerateModal(false);
        setAiInstructions('');
        await loadItinerary(); // Refresh the itinerary
      } else {
        throw new Error(data.error || 'Failed to generate itinerary');
      }
    } catch (error) {
      console.error('Error generating AI itinerary:', error);
      alert(`Failed to generate itinerary: ${error.message}`);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setNewItem({ ...item });
    setShowAddForm(true);
  };

  const handleDeleteItem = async (itemId) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('itinerary_items')
        .delete()
        .eq('id', itemId);

      if (error) {
        console.error('Error deleting itinerary item:', error);
        alert('Failed to delete item. Please try again.');
        return;
      }

      // Remove the item from local state (itinerary is a flat array of items)
      setItinerary(prev => 
        prev.filter(item => item.id !== itemId)
      );

      // Show success message
      alert('Item deleted successfully!');
      
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('An error occurred while deleting the item.');
    } finally {
      setLoading(false);
    }
  };

  const getDateForDay = (day) => {
    const startDateStr = trip.start_date || trip.startDate;
    // Parse the date string directly as YYYY-MM-DD to avoid timezone issues
    const [year, month, dayOfMonth] = startDateStr.split('-').map(Number);
    // Create date in local timezone, then add (day - 1) days
    const targetDate = new Date(year, month - 1, dayOfMonth + day - 1);
    
    // Format as YYYY-MM-DD without timezone conversion
    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const getTripDuration = () => {
    const start = new Date(trip.start_date || trip.startDate);
    const end = new Date(trip.end_date || trip.endDate);
    
    // Normalize dates to avoid timezone issues
    const normalizedStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const normalizedEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    
    return Math.floor((normalizedEnd - normalizedStart) / (1000 * 60 * 60 * 24)) + 1;
  };

  const groupedItinerary = itinerary.reduce((acc, item) => {
    if (!acc[item.day]) {
      acc[item.day] = [];
    }
    acc[item.day].push(item);
    return acc;
  }, {});

  // Drag and drop handlers
  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, day) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDay(day);
  };

  const handleDragLeave = (e) => {
    // Only clear drag over day if we're leaving the day container entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverDay(null);
    }
  };

  const handleDrop = async (e, targetDay) => {
    e.preventDefault();
    setDragOverDay(null);
    
    if (draggedItem && draggedItem.day !== targetDay) {
      try {
        const token = await getAuthToken();
        const headers = {
          'Content-Type': 'application/json'
        };
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        
        // Update on backend first
        const response = await fetch(`/api/trips/${trip.id}/itinerary/${draggedItem.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            ...draggedItem,
            day: targetDay,
            date: getDateForDay(targetDay)
          })
        });

        if (response.ok) {
          // Update local state
          setItinerary(prev => 
            prev.map(item => 
              item.id === draggedItem.id 
                ? { ...item, day: targetDay, date: getDateForDay(targetDay) }
                : item
            ).sort((a, b) => a.day - b.day)
          );
        } else {
          const errorData = await response.json();
          console.error('Failed to update item day:', errorData);
          alert(`Failed to move item: ${errorData.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Error updating item day:', error);
        alert('Error moving item. Please try again.');
      }
    }
    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverDay(null);
  };

  // Handle modal keyboard events
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showAddForm && e.key === 'Escape') {
        setShowAddForm(false);
        setEditingItem(null);
        setNewItem({ title: '', description: '', time: '', location: '', day: 1, duration_minutes: '', cost_estimate: '', booking_url: '', notes: '' });
      }
    };

    if (showAddForm) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [showAddForm]);

  // Handle click outside modal
  const handleModalBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      setShowAddForm(false);
      setEditingItem(null);
      setNewItem({ title: '', description: '', time: '', location: '', day: 1, duration_minutes: '', cost_estimate: '', booking_url: '', notes: '' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Trip Itinerary</h2>
          
          {/* View Toggle */}
          <div className="flex items-center space-x-2 mt-3">
            <span className="text-sm font-medium text-gray-700">View:</span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 text-sm font-medium rounded transition-all ${
                  viewMode === 'list'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                List
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1 text-sm font-medium rounded transition-all ${
                  viewMode === 'calendar'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Calendar
              </button>
            </div>
          </div>
          
          {/* Show lock message if itinerary is locked */}
          {canEdit && isItineraryLocked() && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-2">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0 0v2m0-2h2m-2 0H9m12-6a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span className="text-sm font-medium text-yellow-800">
                  Itinerary locked {trip.lock_days_before || 3} days before trip starts
                </span>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                Trip starts {new Date(trip.start_date).toLocaleDateString()} - editing is now disabled.
              </p>
            </div>
          )}
          
          {canEditItinerary && (
            <p className="text-sm text-gray-500 mt-1">
              Drag activities between days to reorder • Click to edit or delete
            </p>
          )}
          {!canEditItinerary && canEdit && (
            <p className="text-sm text-gray-500 mt-1">
              Itinerary is locked - editing disabled due to date restrictions
            </p>
          )}
          {!canEdit && (
            <p className="text-sm text-gray-500 mt-1">
              View-only access • Only Admins and Managers can edit the itinerary
            </p>
          )}
          
          {/* Activity Search */}
          {itinerary.length > 0 && (
            <div className="mt-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search activities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 pl-10 pr-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <svg 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {searchTerm && (
                <div className="mt-2 text-sm text-gray-600">
                  {(() => {
                    const totalResults = itinerary.filter(item => 
                      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      item.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      item.notes?.toLowerCase().includes(searchTerm.toLowerCase())
                    ).length;
                    
                    return totalResults > 0 
                      ? `Found ${totalResults} ${totalResults === 1 ? 'activity' : 'activities'} matching "${searchTerm}"`
                      : `No activities found matching "${searchTerm}"`;
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
        {canEditItinerary && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowAIGenerateModal(true)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              AI Generate
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Add Activity
            </button>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading itinerary...</span>
        </div>
      )}

      {/* No Dates Set */}
      {!loading && (!trip.start_date || !trip.end_date) && (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Set trip dates first</h3>
          <p className="text-gray-500 mb-4">You need to set start and end dates for your trip before creating an itinerary</p>
          {canEditItinerary && (
            <button
              onClick={() => window.location.href = `/trip?id=${trip.id}&edit=true`}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Edit Trip Details
            </button>
          )}
        </div>
      )}

      {/* Normal Itinerary Content */}
      {!loading && trip.start_date && trip.end_date && (
        <>
          {/* Modal Dialog for Add/Edit Form */}
          {showAddForm && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50"
          onClick={handleModalBackdropClick}
        >
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
              <h3 className="text-lg sm:text-2xl font-bold text-gray-900">
                {editingItem ? 'Edit Activity' : 'Add New Activity'}
              </h3>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingItem(null);
                  setNewItem({ title: '', description: '', time: '', location: '', day: 1, duration_minutes: '', cost_estimate: '', booking_url: '', notes: '' });
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Activity Title *</label>
                  <input
                    type="text"
                    value={newItem.title}
                    onChange={(e) => setNewItem(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-sm sm:text-base"
                    placeholder="e.g., Visit Red Fort"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Time *</label>
                  <input
                    type="time"
                    value={newItem.time}
                    onChange={(e) => setNewItem(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Location</label>
                  <input
                    type="text"
                    value={newItem.location}
                    onChange={(e) => setNewItem(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-sm sm:text-base"
                    placeholder="e.g., Red Fort, Delhi"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Day *</label>
                  <select
                    value={newItem.day}
                    onChange={(e) => setNewItem(prev => ({ ...prev, day: parseInt(e.target.value) }))}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-sm sm:text-base"
                  >
                    {Array.from({ length: getTripDuration() }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        Day {i + 1} - {new Date(getDateForDay(i + 1)).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="mt-4 sm:mt-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Description</label>
                <textarea
                  value={newItem.description}
                  onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                  rows="3"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 resize-none text-sm sm:text-base"
                  placeholder="Describe the activity, what to expect, any special instructions..."
                />
              </div>

              {/* Additional Fields Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Duration (minutes)</label>
                  <input
                    type="number"
                    value={newItem.duration_minutes}
                    onChange={(e) => setNewItem(prev => ({ ...prev, duration_minutes: e.target.value }))}
                    min="0"
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-sm sm:text-base"
                    placeholder="e.g. 120"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Cost Estimate</label>
                  <input
                    type="text"
                    value={newItem.cost_estimate}
                    onChange={(e) => setNewItem(prev => ({ ...prev, cost_estimate: e.target.value }))}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-sm sm:text-base"
                    placeholder="e.g. $25 per person"
                  />
                </div>
              </div>

              <div className="mt-4 sm:mt-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Booking URL</label>
                <input
                  type="url"
                  value={newItem.booking_url}
                  onChange={(e) => setNewItem(prev => ({ ...prev, booking_url: e.target.value }))}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-sm sm:text-base"
                  placeholder="https://example.com/booking"
                />
              </div>

              <div className="mt-4 sm:mt-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                <textarea
                  value={newItem.notes}
                  onChange={(e) => setNewItem(prev => ({ ...prev, notes: e.target.value }))}
                  rows="2"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 resize-none text-sm sm:text-base"
                  placeholder="Additional notes, reminders, or special instructions..."
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end space-y-3 sm:space-y-0 sm:space-x-4 p-4 sm:p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl sm:rounded-b-2xl">
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingItem(null);
                  setNewItem({ title: '', description: '', time: '', location: '', day: 1, duration_minutes: '', cost_estimate: '', booking_url: '', notes: '' });
                }}
                className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 text-gray-700 bg-white border-2 border-gray-200 rounded-lg sm:rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200 text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                onClick={editingItem ? handleUpdateItem : handleAddItem}
                disabled={!newItem.title || !newItem.time}
                className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg sm:rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl text-sm sm:text-base"
              >
                {editingItem ? 'Update Activity' : 'Add Activity'}
              </button>
            </div>
          </div>
        </div>
      )}

          {/* Itinerary Timeline - List View */}
          {viewMode === 'list' && (
            <div className="space-y-8">
              {Array.from({ length: getTripDuration() }, (_, dayIndex) => {
                const dayNumber = dayIndex + 1;
                const allDayItems = groupedItinerary[dayNumber] || [];
                
                // Filter items based on search term
                const dayItems = searchTerm 
                  ? allDayItems.filter(item => 
                      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      item.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      item.notes?.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                  : allDayItems;
                
                const dayDate = getDateForDay(dayNumber);
                
                // Hide days with no matching activities when searching
                if (searchTerm && dayItems.length === 0) {
                  return null;
                }
                
                return (
                  <div 
                    key={dayNumber} 
                    className={`bg-white rounded-xl shadow-sm overflow-hidden transition-all duration-200 ${
                      dragOverDay === dayNumber ? 'ring-2 ring-blue-300 bg-blue-50' : ''
                    }`}
                    onDragOver={(e) => handleDragOver(e, dayNumber)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, dayNumber)}
                  >
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold">Day {dayNumber}</h3>
                          <p className="text-blue-100">{new Date(dayDate).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}</p>
                          {/* Debug info - remove later */}
                          <p className="text-xs text-blue-200">
                            Date calc: {dayDate} | Items in this day: {allDayItems.map(item => `${item.title}(day:${item.day})`).join(', ')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-blue-100">
                            {dayItems.length} {searchTerm ? 'matching' : ''} activities
                            {searchTerm && allDayItems.length > dayItems.length && (
                              <span className="block text-xs opacity-75">
                                of {allDayItems.length} total
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>              <div className="p-6">
                {dayItems.length > 0 ? (
                  <div className="space-y-4">
                    {dayItems
                      .sort((a, b) => a.time.localeCompare(b.time))
                      .map((item, index) => (
                      <div 
                        key={item.id} 
                        className={`flex items-start space-x-4 p-4 rounded-lg transition-all duration-200 cursor-move ${
                          draggedItem?.id === item.id 
                            ? 'bg-blue-100 border-2 border-blue-300 opacity-50' 
                            : 'bg-gray-50 hover:bg-gray-100'
                        } ${canEditItinerary ? 'hover:shadow-md' : ''}`}
                        draggable={canEditItinerary}
                        onDragStart={(e) => canEditItinerary && handleDragStart(e, item)}
                        onDragEnd={handleDragEnd}
                      >
                        <div className="flex-shrink-0 flex items-center space-x-2">
                          {canEditItinerary && (
                            <div className="cursor-move text-gray-400 hover:text-gray-600">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                              </svg>
                            </div>
                          )}
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-sm">{index + 1}</span>
                          </div>
                        </div>
                        
                        <div className="flex-grow">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-gray-900">{highlightSearchTerm(item.title, searchTerm)}</h4>
                              <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                                <span className="flex items-center">
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  {item.time}
                                </span>
                                {item.location && (
                                  <span className="flex items-center">
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    {highlightSearchTerm(item.location, searchTerm)}
                                  </span>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-gray-600 mt-2">{highlightSearchTerm(item.description, searchTerm)}</p>
                              )}
                              
                              {/* Additional Information */}
                              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
                                {item.duration_minutes && (
                                  <span className="flex items-center">
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {Math.floor(item.duration_minutes / 60) > 0 ? `${Math.floor(item.duration_minutes / 60)}h ` : ''}{item.duration_minutes % 60 > 0 ? `${item.duration_minutes % 60}m` : ''}
                                  </span>
                                )}
                                {item.cost_estimate && (
                                  <span className="flex items-center">
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                    </svg>
                                    {item.cost_estimate}
                                  </span>
                                )}
                                {item.booking_url && (
                                  <a 
                                    href={item.booking_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                                  >
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                    Book Now
                                  </a>
                                )}
                              </div>
                              
                              {item.notes && (
                                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                  <div className="flex items-start">
                                    <svg className="w-4 h-4 mr-2 mt-0.5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    <p className="text-sm text-yellow-800">{item.notes}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex space-x-2 ml-4">
                              {/* Comments button - always visible */}
                              <button
                                onClick={() => {
                                  setSelectedItemForComments(item);
                                  setShowComments(true);
                                }}
                                className="flex items-center space-x-1 text-gray-400 hover:text-purple-600 transition-colors"
                                title="View comments"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                {item.comment_count > 0 && (
                                  <span className="text-xs font-medium bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">
                                    {item.comment_count}
                                  </span>
                                )}
                              </button>
                              
                              {/* Edit and delete buttons - only for users who can edit */}
                              {canEditItinerary && (
                                <>
                                  <button
                                    onClick={() => handleEditItem(item)}
                                    className="text-gray-400 hover:text-blue-600 transition-colors"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteItem(item.id)}
                                    className="text-gray-400 hover:text-red-600 transition-colors"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`text-center py-8 rounded-lg transition-all duration-200 ${
                    dragOverDay === dayNumber ? 'bg-blue-100 border-2 border-dashed border-blue-300' : ''
                  }`}>
                    <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-500">
                      {dragOverDay === dayNumber ? 'Drop activity here' : 'No activities planned for this day'}
                    </p>
                    {canEditItinerary && !dragOverDay && (
                      <button
                        onClick={() => {
                          setNewItem(prev => ({ ...prev, day: dayNumber }));
                          setShowAddForm(true);
                        }}
                        className="mt-2 text-blue-600 hover:text-blue-500 font-medium"
                      >
                        Add an activity
                      </button>
                    )}
                    {canEditItinerary && dragOverDay !== dayNumber && (
                      <p className="text-xs text-gray-400 mt-2">
                        Drag activities between days to reorder
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="bg-white rounded-xl shadow-sm">
          {/* Calendar Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <button
              onClick={() => navigateCalendar('prev')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <h3 className="text-lg font-semibold text-gray-900">
              {currentCalendarMonth.toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric' 
              })}
            </h3>
            
            <button
              onClick={() => navigateCalendar('next')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="p-4">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {getCalendarDays(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth()).map((date, index) => {
                const isInTripRange = date && isDateInTripRange(date);
                const dayItems = date ? getItemsForDate(date) : [];
                
                // Debug: Calculate the day number for this date
                let dayNumber = null;
                if (date && trip.start_date) {
                  const tripStart = new Date(trip.start_date);
                  const normalizedTripStart = new Date(tripStart.getFullYear(), tripStart.getMonth(), tripStart.getDate());
                  const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                  const diffTime = normalizedDate.getTime() - normalizedTripStart.getTime();
                  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                  dayNumber = diffDays + 1;
                }
                
                return (
                  <div
                    key={index}
                    className={`min-h-[80px] p-1 border rounded-lg ${
                      !date 
                        ? 'bg-gray-50' 
                        : isInTripRange 
                          ? 'bg-blue-50 border-blue-200' 
                          : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    {date && (
                      <>
                        <div className={`text-sm font-medium mb-1 ${
                          isInTripRange ? 'text-blue-900' : 'text-gray-400'
                        }`}>
                          {date.getDate()}
                          {/* Debug info - remove later */}
                          {isInTripRange && (
                            <div className="text-xs text-gray-500">
                              Day {dayNumber}
                            </div>
                          )}
                        </div>
                        
                        {isInTripRange && dayItems.length > 0 && (
                          <div className="space-y-1">
                            {dayItems
                              .sort((a, b) => a.time.localeCompare(b.time))
                              .slice(0, 2) // Show max 2 items, rest will show as "+X more"
                              .map(item => (
                                <div
                                  key={item.id}
                                  className="text-xs bg-white border border-blue-200 rounded px-1 py-0.5 truncate hover:bg-blue-100 cursor-pointer transition-colors"
                                  title={`${item.time} - ${item.title}${item.location ? ` at ${item.location}` : ''}`}
                                  onClick={() => {
                                    setSelectedItemForComments(item);
                                    setShowComments(true);
                                  }}
                                >
                                  <span className="font-medium text-blue-800">{item.time}</span>
                                  <div className="text-blue-700 leading-tight">
                                    {highlightSearchTerm(item.title, searchTerm)}
                                  </div>
                                </div>
                              ))}
                            {dayItems.length > 2 && (
                              <div className="text-xs text-blue-600 font-medium">
                                +{dayItems.length - 2} more
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

        {/* Empty State */}
        {itinerary.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No itinerary yet</h3>
            <p className="text-gray-500 mb-4">Start planning your trip by adding activities to each day</p>
            {canEditItinerary && (
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                <button
                  onClick={() => setShowAIGenerateModal(true)}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generate with AI
                </button>
                <span className="text-gray-400 hidden sm:block">or</span>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Add Manually
                </button>
              </div>
            )}
          </div>
        )}
        </>
      )}

      {/* AI Generate Itinerary Modal */}
      {showAIGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleModalBackdropClick}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 flex items-center">
                  <svg className="w-6 h-6 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generate AI Itinerary
                </h3>
                <button 
                  onClick={() => setShowAIGenerateModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={isGeneratingAI}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4">
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg mb-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-purple-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-purple-800">AI will generate a complete itinerary</p>
                      <p className="text-xs text-purple-600 mt-1">
                        Based on your trip to {trip.location} from {new Date(trip.start_date).toLocaleDateString()} to {new Date(trip.end_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                <label htmlFor="ai-instructions" className="block text-sm font-medium text-gray-700 mb-2">
                  Special Instructions <span className="text-gray-400">(optional)</span>
                </label>
                <textarea
                  id="ai-instructions"
                  value={aiInstructions}
                  onChange={(e) => setAiInstructions(e.target.value)}
                  placeholder="e.g., Focus on outdoor activities, include kid-friendly places, budget-conscious options, must-see landmarks..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  rows="3"
                  disabled={isGeneratingAI}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tell the AI about your preferences, interests, or specific requirements
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowAIGenerateModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  disabled={isGeneratingAI}
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateWithAI}
                  disabled={isGeneratingAI}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isGeneratingAI ? (
                    <>
                      <svg className="animate-spin w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Generate Itinerary
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comments Modal */}
      {showComments && selectedItemForComments && (
        <ItineraryComments
          tripId={trip.id}
          itemId={selectedItemForComments.id}
          isOpen={showComments}
          onClose={() => {
            setShowComments(false);
            setSelectedItemForComments(null);
          }}
          onCommentUpdate={loadItinerary} // Refresh itinerary to update comment counts
        />
      )}
    </div>
  );
}
