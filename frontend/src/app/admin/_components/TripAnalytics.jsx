"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Line, Bar, Doughnut, Area } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function TripAnalytics({ adminData }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState(30);

  useEffect(() => {
    loadTripAnalytics();
  }, [timeRange]);

  const loadTripAnalytics = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_trip_analytics', {
        days_back: timeRange
      });
      
      if (error) throw error;
      
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading trip analytics:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-48 sm:h-64 bg-gray-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 sm:p-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading trip analytics</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={loadTripAnalytics}
              className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Core theme colors - clean and minimal
  const primaryColor = '#3B82F6';      // Blue-500
  const secondaryColor = '#6B7280';    // Gray-500
  const accentColor = '#10B981';       // Emerald-500
  const backgroundColor = '#F9FAFB';   // Gray-50
  const textColor = '#111827';         // Gray-900
  const lightTextColor = '#6B7280';   // Gray-500

  // Prepare chart data with improved styling
  const tripCreationData = {
    labels: analytics?.daily_trips?.map(item => 
      new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    ) || [],
    datasets: [
      {
        label: 'Trips Created',
        data: analytics?.daily_trips?.map(item => item.count) || [],
        borderColor: primaryColor,
        backgroundColor: `${primaryColor}15`, // 15% opacity
        borderWidth: 3,
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: primaryColor,
        pointBorderWidth: 2,
        pointHoverBackgroundColor: primaryColor,
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 3,
      },
    ],
  };

  const destinationData = {
    labels: analytics?.popular_destinations?.map(item => item.destination) || [],
    datasets: [
      {
        label: 'Number of Trips',
        data: analytics?.popular_destinations?.map(item => item.count) || [],
        backgroundColor: [
          `${primaryColor}E6`,    // Blue with opacity
          `${accentColor}E6`,     // Emerald with opacity
          '#F59E0BE6',            // Amber with opacity
          '#8B5CF6E6',            // Violet with opacity
          '#06B6D4E6',            // Cyan with opacity
          '#EC4899E6',            // Pink with opacity
          '#84CC16E6',            // Lime with opacity
          '#F97316E6',            // Orange with opacity
        ],
        borderColor: [
          primaryColor,
          accentColor,
          '#F59E0B',
          '#8B5CF6',
          '#06B6D4',
          '#EC4899',
          '#84CC16',
          '#F97316',
        ],
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  const statusData = {
    labels: Object.keys(analytics?.trip_status_distribution || {}),
    datasets: [
      {
        data: Object.values(analytics?.trip_status_distribution || {}),
        backgroundColor: [
          `${accentColor}E6`,     // Active - emerald
          '#F59E0BE6',            // Planning - amber
          '#EF4444E6',            // Cancelled - red
          `${primaryColor}E6`,    // Completed - blue
          '#9CA3AFE6',            // Unknown - gray
        ],
        borderColor: [
          accentColor,
          '#F59E0B',
          '#EF4444',
          primaryColor,
          '#9CA3AF',
        ],
        borderWidth: 3,
        hoverBorderWidth: 4,
        spacing: 2,
      },
    ],
  };

  // Improved chart options
  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index',
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: primaryColor,
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        displayColors: false,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          color: lightTextColor,
          font: {
            size: 12,
            weight: '500',
          },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: '#F3F4F6',
          drawBorder: false,
        },
        border: {
          display: false,
        },
        ticks: {
          precision: 0,
          color: lightTextColor,
          font: {
            size: 12,
            weight: '500',
          },
          padding: 8,
        },
      },
    },
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: primaryColor,
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        displayColors: false,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          color: lightTextColor,
          font: {
            size: 11,
            weight: '500',
          },
          maxRotation: 45,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: '#F3F4F6',
          drawBorder: false,
        },
        border: {
          display: false,
        },
        ticks: {
          precision: 0,
          color: lightTextColor,
          font: {
            size: 12,
            weight: '500',
          },
          padding: 8,
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
          font: {
            size: 12,
            weight: '500',
          },
          color: textColor,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: primaryColor,
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        displayColors: true,
      },
    },
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Time Range Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Trip Analytics</h2>
            <p className="text-sm text-gray-500 mt-1">Insights and trends from your trip data</p>
          </div>
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {[
              { days: 7, label: '7d' },
              { days: 30, label: '30d' },
              { days: 90, label: '90d' }
            ].map(({ days, label }) => (
              <button
                key={days}
                onClick={() => setTimeRange(days)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  timeRange === days
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="ml-4 min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-500 truncate">Total Trips</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics?.daily_trips?.reduce((sum, item) => sum + item.count, 0) || 0}
              </p>
              <p className="text-xs text-gray-400 mt-1">Last {timeRange} days</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4 min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-500 truncate">Destinations</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics?.popular_destinations?.length || 0}
              </p>
              <p className="text-xs text-gray-400 mt-1">Unique locations</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-md transition-shadow duration-200 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <div className="ml-4 min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-500 truncate">Daily Average</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics?.daily_trips?.length > 0 
                  ? Math.round(analytics.daily_trips.reduce((sum, item) => sum + item.count, 0) / analytics.daily_trips.length)
                  : 0
                }
              </p>
              <p className="text-xs text-gray-400 mt-1">Trips per day</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* Trip Creation Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Trip Creation Trend</h3>
              <p className="text-sm text-gray-500 mt-1">Daily trip creation over time</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Trips</span>
            </div>
          </div>
          <div className="h-48 sm:h-64">
            <Line data={tripCreationData} options={lineChartOptions} />
          </div>
        </div>

        {/* Trip Status Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Trip Status</h3>
              <p className="text-sm text-gray-500 mt-1">Current status distribution</p>
            </div>
          </div>
          <div className="h-48 sm:h-64">
            <Doughnut data={statusData} options={doughnutOptions} />
          </div>
        </div>

        {/* Popular Destinations */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-md transition-shadow duration-200 xl:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Popular Destinations</h3>
              <p className="text-sm text-gray-500 mt-1">Most visited locations</p>
            </div>
          </div>
          <div className="h-48 sm:h-64">
            <Bar data={destinationData} options={barChartOptions} />
          </div>
        </div>
      </div>

      {/* Destination Details Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Destination Details</h3>
          <p className="text-sm text-gray-500 mt-1">Detailed breakdown of trip destinations</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Destination
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trips
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Budget
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Popularity
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analytics?.popular_destinations?.slice(0, 8).map((destination, index) => {
                const totalTrips = analytics.popular_destinations.reduce((sum, d) => sum + d.count, 0);
                const percentage = totalTrips > 0 ? Math.round((destination.count / totalTrips) * 100) : 0;
                
                return (
                  <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                          index === 0 ? 'bg-yellow-100 text-yellow-800' :
                          index === 1 ? 'bg-gray-100 text-gray-800' :
                          index === 2 ? 'bg-orange-100 text-orange-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {index + 1}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                        {destination.destination}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-medium">
                        {destination.count}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {destination.avg_budget ? `₹${Math.round(destination.avg_budget).toLocaleString()}` : 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500 min-w-[3rem]">{percentage}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
