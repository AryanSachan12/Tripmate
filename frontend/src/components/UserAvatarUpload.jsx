import { useState } from 'react';
import Image from 'next/image';
import { supabase } from '../lib/supabase';

export default function UserAvatarUpload({ user, onAvatarUpdated }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleAvatarUpload = async (file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setUploading(true);
    setError('');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user?.id) {
        setError('You must be logged in to upload images');
        setUploading(false);
        return;
      }

      // Use server-side upload API for avatar
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

      if (!response.ok) {
        setError(result.error || 'Failed to upload avatar');
        return;
      }

      // Call parent component callback
      if (onAvatarUpdated) {
        onAvatarUpdated(result.data.user);
      }

      alert('Avatar updated successfully!');

    } catch (error) {
      console.error('Error uploading avatar:', error);
      setError(`An error occurred while uploading avatar: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Current Avatar */}
      <div className="flex items-center space-x-4">
        <div className="relative">
          <Image
            src={user?.avatar_url || '/profile-icon.png'}
            alt="User avatar"
            width={80}
            height={80}
            className="rounded-full object-cover border-2 border-gray-200"
          />
          {uploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>
        <div>
          <h4 className="font-medium text-gray-900">Profile Picture</h4>
          <p className="text-sm text-gray-500">Upload a new avatar for your profile</p>
        </div>
      </div>

      {/* Upload Control */}
      <div className="space-y-3">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files[0];
            if (file) {
              handleAvatarUpload(file);
            }
          }}
          disabled={uploading}
          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        
        {uploading && (
          <div className="flex items-center space-x-2 text-blue-600">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm">Uploading avatar...</span>
          </div>
        )}
        
        {error && (
          <div className="flex items-center space-x-2 text-red-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">{error}</span>
          </div>
        )}
        
        <p className="text-sm text-gray-500">Recommended: Square image, at least 200x200px (max 5MB)</p>
      </div>
    </div>
  );
}
