"use client";

import { useState, useEffect } from "react";
import Image from 'next/image';
import Link from 'next/link';
import {
  StarIcon,
  UserIcon,
  CalendarIcon,
  MapPinIcon,
} from "@heroicons/react/24/solid";
import { StarIcon as StarOutlineIcon } from "@heroicons/react/24/outline";

export default function CommunityPage() {
  const [tripReviews, setTripReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("recent"); // recent, rating, location
  const [error, setError] = useState("");

  useEffect(() => {
    fetchReviews();
  }, [sortBy]);

  const fetchReviews = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/reviews?sortBy=${sortBy}&limit=20`);
      const data = await response.json();

      if (data.success) {
        setTripReviews(data.data);
      } else {
        setError("Failed to load reviews");
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
      setError("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  };

  // Reviews are already sorted by the API based on sortBy parameter
  const sortedReviews = tripReviews;

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) =>
      i < rating ? (
        <StarIcon key={i} className="h-5 w-5 text-yellow-400" />
      ) : (
        <StarOutlineIcon key={i} className="h-5 w-5 text-gray-300" />
      )
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 sm:pt-20">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-64 sm:h-80 lg:h-96 bg-gray-200 rounded-2xl sm:rounded-3xl"></div>
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
              >
                <div className="space-y-4">
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-20 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 sm:pt-20">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
          <div className="text-center py-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Community Reviews
            </h1>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchReviews}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16 sm:pt-20">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        {/* Hero Section */}
        <div className="relative mb-8 sm:mb-12">
          <div className="relative h-64 sm:h-80 lg:h-96 rounded-2xl sm:rounded-3xl overflow-hidden">
            {/* Hero Image */}
            <Image 
              src="/review.png" 
              alt="Community Reviews" 
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
                  Community Reviews
                </p>
                <p className="text-lg sm:text-xl lg:text-2xl text-white/90 mb-6 sm:mb-8 leading-relaxed">
                  Read authentic experiences and reviews from fellow travelers who have completed their journeys
                </p>
                
                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <Link href="/explore" className="bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg transition-all duration-200 shadow-lg hover:shadow-xl">
                    Find Your Trip
                  </Link>
                  <Link href="/dashboard" className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border border-white/30 px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg transition-all duration-200">
                    Share Experience
                  </Link>
                </div>
              </div>
            </div>
            
            {/* Bottom Fade for smooth transition */}
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-50 to-transparent"></div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <StarIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {tripReviews.length > 0
                    ? (
                        tripReviews.reduce(
                          (sum, review) => sum + review.rating,
                          0
                        ) / tripReviews.length
                      ).toFixed(1)
                    : "0.0"}
                </p>
                <p className="text-gray-600">Average Rating</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <UserIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {tripReviews.length}
                </p>
                <p className="text-gray-600">Total Reviews</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <MapPinIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {
                    new Set(tripReviews.map((review) => review.trip.location))
                      .size
                  }
                </p>
                <p className="text-gray-600">Destinations</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sort Options */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Sort Reviews
            </h3>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="recent">Most Recent</option>
              <option value="rating">Highest Rating</option>
              <option value="location">By Location</option>
            </select>
          </div>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {tripReviews.length > 0 ? (
            sortedReviews.map((review) => (
              <div
                key={review.id}
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {review.trip.title}
                    </h3>
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <MapPinIcon className="h-4 w-4 mr-1" />
                      {review.trip.location}
                      <span className="mx-2">•</span>
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      {review.trip.duration}
                    </div>
                  </div>
                </div>

                {/* Rating */}
                <div className="flex items-center mb-4">
                  <div className="flex">{renderStars(review.rating)}</div>
                  <span className="ml-2 text-sm font-medium text-gray-900">
                    {review.rating}.0
                  </span>
                </div>

                {/* Comment */}
                {review.review_text && (
                  <p className="text-gray-700 mb-4 leading-relaxed">
                    {review.review_text}
                  </p>
                )}

                {/* Hosted by */}
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-sm text-blue-700">
                    <span className="font-medium">Hosted by:</span>{" "}
                    {review.host.name}
                  </p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">
                        {review.user.name.charAt(0)}
                      </span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        <span className="text-sm font-medium text-blue-600">
                          {review.user.name}
                          {review.user.name === review.host.name && " (Host)"}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500">
                        Reviewed on{" "}
                        {new Date(review.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 text-center py-12">
              <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <StarIcon className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Reviews Yet
              </h3>
              <p className="text-gray-600">
                Be the first to share your travel experience! Complete a trip
                and leave a review.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
