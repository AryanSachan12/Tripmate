'use client'

import { useState, useEffect } from 'react'
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid'
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline'
import { supabase } from '../../../lib/supabase'

export default function TripReviewSection({ trip, user }) {
  const [userReview, setUserReview] = useState(null)
  const [rating, setRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [allReviews, setAllReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (trip?.id) {
      fetchReviews()
    }
  }, [trip?.id])

  const fetchReviews = async () => {
    try {
      const response = await fetch(`/api/trips/${trip.id}/reviews`)
      const data = await response.json()
      
      if (data.success) {
        setAllReviews(data.data)
        // Find user's existing review
        const existingUserReview = data.data.find(review => review.user.id === user?.id)
        if (existingUserReview) {
          setUserReview(existingUserReview)
          setRating(existingUserReview.rating)
          setReviewText(existingUserReview.review_text || '')
        }
      }
    } catch (error) {
      console.error('Error fetching reviews:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitReview = async () => {
    if (!rating) {
      alert('Please select a rating')
      return
    }

    setIsSubmitting(true)
    try {
      // Get the current session for authentication
      const { data: { session } } = await supabase.auth.getSession()
      
      console.log('Session:', !!session)
      console.log('Access token:', !!session?.access_token)
      
      if (!session?.access_token) {
        alert('You must be logged in to submit a review')
        return
      }

      const url = `/api/trips/${trip.id}/reviews`
      const method = userReview ? 'PUT' : 'POST'
      
      console.log('Making request to:', url)
      console.log('Method:', method)
      console.log('Data:', { rating, review_text: reviewText.trim() || null })
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          rating,
          review_text: reviewText.trim() || null
        })
      })

      console.log('Response status:', response.status)
      const data = await response.json()
      console.log('Response data:', data)
      
      if (data.success) {
        // Refresh reviews
        await fetchReviews()
        setShowReviewForm(false)
        setIsEditing(false)
      } else {
        alert(data.error || 'Failed to submit review')
      }
    } catch (error) {
      console.error('Error submitting review:', error)
      alert('Failed to submit review')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStars = (currentRating, interactive = false, size = 'w-6 h-6') => {
    return Array.from({ length: 5 }, (_, i) => {
      const filled = i < currentRating
      const StarIcon = filled ? StarSolidIcon : StarOutlineIcon
      
      return (
        <StarIcon
          key={i}
          className={`${size} ${
            interactive 
              ? 'cursor-pointer hover:text-yellow-400 transition-colors' 
              : ''
          } ${
            filled ? 'text-yellow-400' : 'text-gray-300'
          }`}
          onClick={interactive ? () => setRating(i + 1) : undefined}
        />
      )
    })
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Don't show for non-completed trips or if user is not a member
  // For testing: Allow admins to review even if trip is not completed
  if (!trip?.userRole || trip.userRole === 'None') {
    return null
  }
  
  if (trip?.status !== 'completed' && trip?.userRole !== 'Admin') {
    return null
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
        <div className="animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-1/4 mb-3"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {userReview ? 'Your Trip Review' : 'Rate This Trip'}
        </h3>
        {userReview && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Edit Review
          </button>
        )}
      </div>

      {/* User's Review Section */}
      {userReview && !isEditing ? (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              {renderStars(userReview.rating, false, 'w-5 h-5')}
              <span className="ml-2 text-sm font-medium text-gray-900">
                {userReview.rating}/5
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {formatDate(userReview.created_at)}
            </span>
          </div>
          {userReview.review_text && (
            <p className="text-gray-700 text-sm leading-relaxed">
              {userReview.review_text}
            </p>
          )}
        </div>
      ) : (!userReview || isEditing) && (showReviewForm || isEditing) ? (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3">
            {userReview ? 'Edit Your Review' : 'Share Your Experience'}
          </h4>
          
          {/* Rating Input */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rating *
            </label>
            <div className="flex items-center space-x-1">
              {renderStars(rating, true, 'w-6 h-6')}
              <span className="ml-2 text-sm text-gray-600">
                {rating > 0 ? `${rating}/5` : 'Select rating'}
              </span>
            </div>
          </div>

          {/* Review Text Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Review (Optional)
            </label>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share your thoughts about this trip..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSubmitReview}
              disabled={isSubmitting || !rating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {isSubmitting ? 'Submitting...' : userReview ? 'Update Review' : 'Submit Review'}
            </button>
            <button
              onClick={() => {
                setShowReviewForm(false)
                setIsEditing(false)
                if (userReview) {
                  setRating(userReview.rating)
                  setReviewText(userReview.review_text || '')
                } else {
                  setRating(0)
                  setReviewText('')
                }
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <button
            onClick={() => setShowReviewForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            Write a Review
          </button>
          <p className="mt-2 text-xs text-gray-600">
            Share your experience with other travelers
          </p>
        </div>
      )}

    </div>
  )
}
