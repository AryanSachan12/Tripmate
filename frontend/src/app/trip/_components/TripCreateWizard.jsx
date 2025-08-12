"use client";
import { useState } from 'react';
import Image from 'next/image';
import { tripApi } from '../../../lib/api';
import { supabase } from '../../../lib/supabase';
import MultiCitySelector from './MultiCitySelector';

export default function TripCreateWizard({ onTripCreated, initialData }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState(() => {
    // Use initial data if provided, otherwise use defaults
    if (initialData) {
      return {
        title: initialData.title || '',
        description: initialData.description || '',
        cities: initialData.cities && initialData.cities.length > 0 
          ? initialData.cities 
          : [{
              id: Date.now(),
              city_name: '',
              country: '',
              arrival_date: '',
              departure_date: '',
              notes: ''
            }],
        start_date: initialData.start_date || '',
        end_date: initialData.end_date || '',
        budget: initialData.budget || '',
        max_members: initialData.max_members || '',
        tags: initialData.tags || [],
        visibility: initialData.visibility || 'public',
        cover_image: null,
        cover_image_url: initialData.cover_image_url || null
      };
    }
    
    // Default form data
    return {
      title: '',
      description: '',
      cities: [{
        id: Date.now(),
        city_name: '',
        country: '',
        arrival_date: '',
        departure_date: '',
        notes: ''
      }],
      start_date: '',
      end_date: '',
      budget: '',
      max_members: '',
      tags: [],
      visibility: 'public', // public, private, link
      cover_image: null,
      cover_image_url: null
    };
  });

  const availableTags = [
    'Adventure', 'Beach', 'Mountains', 'Culture', 'Food', 'Nature', 
    'Trekking', 'Party', 'Relaxation', 'Photography', 'Wildlife', 'Spiritual'
  ];

  const steps = [
    { id: 1, name: 'Basic Info', description: 'Trip title, description, and location' },
    { id: 2, name: 'Dates & Budget', description: 'When and how much' },
    { id: 3, name: 'Preferences', description: 'Tags, visibility, and group size' },
    { id: 4, name: 'Review', description: 'Review and create your trip' }
  ];

  const handleInputChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === 'file') {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
      if (name === 'cover_image' && files[0]) {
        handleImageUpload(files[0]);
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleImageUpload = async (file) => {
    if (!file) return;

    console.log('🚀 Starting image upload:', file.name, file.size, file.type);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setUploadingImage(true);
    setError('');
    
    try {
      // Get current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🔐 Session check:', session?.user?.id ? 'User logged in' : 'No user session');
      
      if (!session?.user?.id) {
        setError('You must be logged in to upload images');
        setUploadingImage(false);
        return;
      }

      // Use server-side upload API to bypass RLS issues
      console.log('� Uploading via server API...');
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'trip-images');

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('❌ Upload API error:', result);
        setError(result.error || 'Failed to upload image');
        return;
      }

      console.log('✅ Upload successful:', result);

      // Update form data with the uploaded image URL
      setFormData(prev => ({
        ...prev,
        cover_image_url: result.url
      }));

      console.log('✅ Image upload completed successfully!');

    } catch (error) {
      console.error('💥 Unexpected error during upload:', error);
      setError(`An error occurred while uploading image: ${error.message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleTagToggle = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        return formData.title && formData.description && formData.cities.length > 0 && formData.cities[0].city_name;
      case 2:
        return formData.start_date && formData.end_date && formData.budget;
      case 3:
        return formData.max_members && formData.tags.length > 0;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');
    try {
      // Get current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('You must be logged in to create a trip');
      }

      // Prepare data for API
      const tripData = {
        title: formData.title,
        description: formData.description,
        cities: formData.cities.filter(city => city.city_name), // Only include cities with names
        start_date: formData.start_date,
        end_date: formData.end_date,
        budget: parseInt(formData.budget) || 0,
        max_members: parseInt(formData.max_members) || 10,
        tags: formData.tags,
        visibility: formData.visibility,
        status: 'planning',
        cover_image_url: formData.cover_image_url
      };

      // Create trip via API
      const response = await fetch('/api/trips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(tripData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create trip');
      }

      const result = await response.json();
      console.log('🎯 Full API response:', result);
      
      // Check if response has expected structure
      if (!result.success || !result.data || !result.data.trip) {
        console.error('❌ Unexpected API response structure:', result);
        throw new Error('Invalid response from server');
      }
      
      // Extract trip and member data from the API response
      const createdTrip = result.data.trip;
      const memberData = result.data.member;
      
      console.log('🚀 Created trip data:', createdTrip);
      console.log('👤 Member data:', memberData);
      console.log('🆔 Trip ID:', createdTrip.id);
      
      // Create trip object with proper structure
      const newTrip = {
        id: createdTrip.id,
        ...createdTrip,
        userRole: 'Admin',
        currentMembers: 1,
        members: [
          { 
            id: memberData.user_id, 
            name: "You", 
            role: "Admin", 
            avatar: "/profile-icon.png" 
          }
        ],
        itinerary: []
      };
      
      console.log('✅ Final newTrip object:', newTrip);
      console.log('🔗 About to redirect to:', `/trip?id=${newTrip.id}`);
      onTripCreated(newTrip);
    } catch (error) {
      console.error('Error creating trip:', error);
      setError(error.message || 'Failed to create trip. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-8">
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Trip Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g., Amazing Himachal Adventure"
                  className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="4"
                  placeholder="Describe your trip, what makes it special, and what travelers can expect..."
                  className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 resize-none"
                />
              </div>

              {/* Multi-City Selector */}
              <MultiCitySelector 
                cities={formData.cities} 
                setCities={(cities) => setFormData(prev => ({ ...prev, cities }))}
                errors={{}}
              />

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Cover Image
                </label>
                <div className="space-y-3">
                  <input
                    type="file"
                    name="cover_image"
                    onChange={handleInputChange}
                    accept="image/*"
                    disabled={uploadingImage}
                    className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  {uploadingImage && (
                    <div className="flex items-center space-x-2 text-blue-600">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm">Uploading image...</span>
                    </div>
                  )}
                  {formData.cover_image_url && (
                    <div className="flex items-center space-x-2 text-green-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm">Image uploaded successfully!</span>
                    </div>
                  )}
                  <p className="text-sm text-gray-500">Upload a cover image for your trip (optional, max 10MB)</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date *
                </label>
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Budget Per Person *
              </label>
              <input
                type="text"
                name="budget"
                value={formData.budget}
                onChange={handleInputChange}
                placeholder="e.g., ₹15,000"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-1">
                Include accommodation, food, and activities
              </p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Group Size *
              </label>
              <input
                type="number"
                name="max_members"
                value={formData.max_members}
                onChange={handleInputChange}
                min="2"
                max="20"
                placeholder="e.g., 8"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Trip Tags * (Select at least one)
              </label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagToggle(tag)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      formData.tags.includes(tag)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Trip Visibility
              </label>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="visibility"
                    value="public"
                    checked={formData.visibility === 'public'}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-3">
                    <span className="font-medium">Public</span>
                    <span className="text-gray-500 block text-sm">Anyone can find and request to join</span>
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="visibility"
                    value="private"
                    checked={formData.visibility === 'private'}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-3">
                    <span className="font-medium">Private</span>
                    <span className="text-gray-500 block text-sm">Only you can invite people</span>
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="visibility"
                    value="link"
                    checked={formData.visibility === 'link'}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-3">
                    <span className="font-medium">Link Only</span>
                    <span className="text-gray-500 block text-sm">Only people with the invite link can join</span>
                  </span>
                </label>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Trip Summary</h3>
              <div className="space-y-3">
                <div>
                  <span className="font-medium text-gray-700">Title:</span>
                  <span className="ml-2 text-gray-900">{formData.title}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Cities:</span>
                  <span className="ml-2 text-gray-900">
                    {formData.cities.map(city => city.city_name).filter(Boolean).join(' → ')}
                    {formData.cities.length > 1 && (
                      <span className="text-sm text-gray-500 ml-2">
                        ({formData.cities.length} destinations)
                      </span>
                    )}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Dates:</span>
                  <span className="ml-2 text-gray-900">{formData.start_date} to {formData.end_date}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Budget:</span>
                  <span className="ml-2 text-gray-900">{formData.budget}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Group Size:</span>
                  <span className="ml-2 text-gray-900">{formData.max_members} people</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Visibility:</span>
                  <span className="ml-2 text-gray-900 capitalize">{formData.visibility}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Tags:</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.tags.map(tag => (
                      <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                Once created, you can add itinerary items, invite members, and start planning your adventure!
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-16 sm:pt-20">
      {/* Hero Section */}
      <div className="relative mb-8 sm:mb-12">
        <div className="relative h-64 sm:h-80 lg:h-96 rounded-2xl sm:rounded-3xl overflow-hidden mx-3 sm:mx-4 lg:mx-8">
          {/* Hero Image */}
          <Image 
            src="/create.png" 
            alt="Create Trip" 
            fill
            className="object-cover"
            priority
          />
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/20"></div>
          
          {/* Content Overlay */}
          <div className="absolute inset-0 flex flex-col justify-center items-start p-6 sm:p-8 lg:p-12">
            <div className="max-w-2xl">
              <p className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-4 sm:mb-6 leading-tight">
                Create Your Adventure
              </p>
              <p className="text-lg sm:text-xl lg:text-2xl text-white/90 mb-6 sm:mb-8 leading-relaxed">
                Plan the perfect group trip and connect with fellow travelers on your next adventure
              </p>
              
              {/* Progress Indicator */}
              <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                <span className="text-white font-medium">Step {currentStep} of {steps.length}</span>
                <div className="flex space-x-1">
                  {steps.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        currentStep > index + 1 
                          ? 'bg-green-400' 
                          : currentStep === index + 1 
                            ? 'bg-white' 
                            : 'bg-white/40'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Bottom Fade for smooth transition */}
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-50 to-transparent"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 pb-8">
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden border border-gray-100 mx-2 sm:mx-0">
      {/* Enhanced Progress Steps */}
      <div className="px-4 sm:px-8 py-6 sm:py-8 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-100">
        <div className="mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Create Your Trip</h2>
          {/* <p className="text-sm sm:text-base text-gray-600">Step {currentStep} of {steps.length}</p> */}
        </div>
        
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className={`relative flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-all duration-300 ${
                currentStep >= step.id 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
                  : 'bg-white text-gray-400 border-2 border-gray-200'
              }`}>
                {currentStep > step.id ? (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="font-semibold text-sm">{step.id}</span>
                )}
              </div>
              <div className="ml-2 sm:ml-3 hidden sm:block flex-1">
                <p className={`text-xs sm:text-sm font-semibold transition-colors ${
                  currentStep >= step.id ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  {step.name}
                </p>
                <p className="text-xs text-gray-500 hidden md:block">{step.description}</p>
              </div>
              {index < steps.length - 1 && (
                <div className={`hidden sm:block h-px flex-1 mx-2 sm:mx-4 transition-all duration-300 ${
                  currentStep > step.id 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600' 
                    : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Enhanced Step Content */}
      <div className="px-4 sm:px-8 py-6 sm:py-10">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6 sm:mb-8">
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              {steps[currentStep - 1].name}
            </h3>
            <p className="text-sm sm:text-base text-gray-600">
              {steps[currentStep - 1].description}
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl sm:rounded-2xl p-4 sm:p-8">
            {renderStepContent()}
          </div>
        </div>
      </div>

      {/* Enhanced Navigation */}
      <div className="px-4 sm:px-8 py-4 sm:py-6 bg-gradient-to-r from-gray-50 to-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-t border-gray-200 space-y-3 sm:space-y-0">
        <button
          onClick={handlePrevious}
          disabled={currentStep === 1}
          className="flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 rounded-lg hover:bg-white text-sm sm:text-base"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Previous
        </button>
        
        <div className="flex items-center justify-center space-x-2">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                currentStep > index + 1 
                  ? 'bg-green-500' 
                  : currentStep === index + 1 
                    ? 'bg-blue-500' 
                    : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
        
        <div className="flex space-x-3">
          {currentStep < 4 ? (
            <button
              onClick={handleNext}
              disabled={!validateStep(currentStep)}
              className="flex items-center justify-center w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl text-sm sm:text-base"
            >
              Next
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex items-center justify-center w-full sm:w-auto bg-gradient-to-r from-green-600 to-blue-600 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl text-sm sm:text-base"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2"></div>
                  Creating Trip...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Create Trip
                </>
              )}
            </button>
          )}
        </div>
      </div>
        </div>
      </div>
    </div>
  );
}
