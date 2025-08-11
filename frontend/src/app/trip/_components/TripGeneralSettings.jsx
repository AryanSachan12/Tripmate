import { useState, useImperativeHandle, forwardRef } from 'react';
import Image from 'next/image';
import { supabase } from '../../../lib/supabase';

const availableTags = [
  'Adventure', 'Beach', 'Mountains', 'Culture', 'Food', 'Nature', 
  'Trekking', 'Party', 'Relaxation', 'Photography', 'Wildlife', 'Spiritual'
];

const TripGeneralSettings = forwardRef(({ trip, onTripUpdated }, ref) => {
  const [formData, setFormData] = useState({
    title: trip.title || '',
    description: trip.description || '',
    location: trip.location || trip.destination || '',
    start_date: trip.start_date || trip.startDate || '',
    end_date: trip.end_date || trip.endDate || '',
    budget: trip.budget || '',
    max_members: trip.max_members || trip.maxMembers || 1,
    tags: trip.tags || [],
    visibility: trip.visibility || 'private',
    cover_image_url: trip.cover_image_url || ''
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState('');
  const [error, setError] = useState('');

  useImperativeHandle(ref, () => ({
    getPendingChanges: () => formData,
    validate: () => validateForm(),
    setError,
    hasUnsavedChanges: () => {
      // Check if any field has changed from the original trip data
      return (
        formData.title !== (trip.title || '') ||
        formData.description !== (trip.description || '') ||
        formData.location !== (trip.location || trip.destination || '') ||
        formData.start_date !== (trip.start_date || trip.startDate || '') ||
        formData.end_date !== (trip.end_date || trip.endDate || '') ||
        formData.budget !== (trip.budget || '') ||
        formData.max_members !== (trip.max_members || trip.maxMembers || 1) ||
        JSON.stringify(formData.tags) !== JSON.stringify(trip.tags || []) ||
        formData.visibility !== (trip.visibility || 'private') ||
        formData.cover_image_url !== (trip.cover_image_url || '')
      );
    },
    saveChanges: async () => {
      if (!validateForm()) {
        return false;
      }

      try {
        const { data: { session } } = await (await import('../../../lib/supabase')).supabase.auth.getSession();
        if (!session?.access_token) {
          setError('Authentication required');
          return false;
        }

        const response = await fetch(`/api/trips/${trip.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(formData),
        });

        if (response.ok) {
          const result = await response.json();
          // Update the parent component with the new trip data
          if (onTripUpdated) {
            onTripUpdated(result.data || { ...trip, ...formData });
          }
          return true;
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to save changes');
          return false;
        }
      } catch (error) {
        console.error('Error saving changes:', error);
        setError('An error occurred while saving changes');
        return false;
      }
    }
  }));

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleTagToggle = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setImageError('Please select an image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setImageError('File size must be less than 10MB');
      return;
    }
    setUploadingImage(true);
    setImageError('');
    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setImageError('Authentication required');
        return;
      }

      // Use server-side upload API
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('bucket', 'trip-images');
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formDataUpload,
      });
      const result = await response.json();
      if (!response.ok) {
        setImageError(result.error || 'Failed to upload image');
        return;
      }
      setFormData(prev => ({ ...prev, cover_image_url: result.url }));
    } catch (error) {
      console.error('Image upload error:', error);
      setImageError('An error occurred while uploading image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteCoverImage = () => {
    setFormData(prev => ({ ...prev, cover_image_url: '' }));
  };

  const validateForm = () => {
    if (!formData.title || !formData.description || !formData.location) {
      setError('Please fill in all required fields');
      return false;
    }
    if (formData.start_date && formData.end_date && new Date(formData.start_date) >= new Date(formData.end_date)) {
      setError('End date must be after start date');
      return false;
    }
    if (formData.max_members < (trip.current_members || trip.currentMembers || 1)) {
      setError(`Maximum members cannot be less than current members (${trip.current_members || trip.currentMembers || 1})`);
      return false;
    }
    setError('');
    return true;
  };

  return (
    <div className="space-y-6">
      {/* Trip Cover Image */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="font-medium text-gray-900 mb-4">Trip Cover Image</h4>
        {formData.cover_image_url ? (
          <div className="mb-4">
            <div className="relative w-full h-48 rounded-lg overflow-hidden">
              <Image src={formData.cover_image_url} alt="Trip cover" fill className="object-cover" />
            </div>
            <button onClick={handleDeleteCoverImage} className="mt-2 text-red-600 hover:text-red-800 text-sm font-medium">
              Remove Cover Image
            </button>
          </div>
        ) : (
          <div className="mb-4 w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-500 text-sm">No cover image set</p>
            </div>
          </div>
        )}
        <div className="space-y-3">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) handleImageUpload(file);
            }}
            disabled={uploadingImage}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {uploadingImage && (
            <div className="flex items-center space-x-2 text-blue-600">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">Uploading image...</span>
            </div>
          )}
          {imageError && (
            <div className="flex items-center space-x-2 text-red-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">{imageError}</span>
            </div>
          )}
          <p className="text-sm text-gray-500">Upload a new cover image for your trip (max 10MB)</p>
        </div>
      </div>
      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">{error}</div>
      )}
      {/* Trip Edit Fields */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Trip Title *</label>
          <input type="text" name="title" value={formData.title} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., Himachal Pradesh Adventure" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
          <textarea name="description" value={formData.description} onChange={handleInputChange} rows="4" className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" placeholder="Describe your trip..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Location *</label>
          <input type="text" name="location" value={formData.location} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., Himachal Pradesh, India" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
            <input type="date" name="start_date" value={formData.start_date} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
            <input type="date" name="end_date" value={formData.end_date} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Budget Per Person *</label>
            <input type="text" name="budget" value={formData.budget} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., ₹15,000" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Members *</label>
            <input type="number" name="max_members" value={formData.max_members} onChange={handleInputChange} min={trip.current_members || trip.currentMembers || 1} max="20" className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            <p className="text-sm text-gray-500 mt-1">Current members: {trip.current_members || trip.currentMembers || 1}</p>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Trip Tags</label>
          <div className="flex flex-wrap gap-2">
            {availableTags.map(tag => (
              <button key={tag} type="button" onClick={() => handleTagToggle(tag)} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${formData.tags.includes(tag) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{tag}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Trip Visibility</label>
          <div className="space-y-3">
            <label className="flex items-center">
              <input type="radio" name="visibility" value="public" checked={formData.visibility === 'public'} onChange={handleInputChange} className="h-4 w-4 text-blue-600 focus:ring-blue-500" />
              <span className="ml-3"><span className="font-medium">Public</span><span className="text-gray-500 block text-sm">Visible in explore page, anyone can request to join</span></span>
            </label>
            <label className="flex items-center">
              <input type="radio" name="visibility" value="private" checked={formData.visibility === 'private'} onChange={handleInputChange} className="h-4 w-4 text-blue-600 focus:ring-blue-500" />
              <span className="ml-3"><span className="font-medium">Private</span><span className="text-gray-500 block text-sm">Hidden from explore, only admins can invite members</span></span>
            </label>
            <label className="flex items-center">
              <input type="radio" name="visibility" value="link" checked={formData.visibility === 'link'} onChange={handleInputChange} className="h-4 w-4 text-blue-600 focus:ring-blue-500" />
              <span className="ml-3"><span className="font-medium">Link Only</span><span className="text-gray-500 block text-sm">Hidden from explore, members can join via invite links</span></span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
});

export default TripGeneralSettings;
