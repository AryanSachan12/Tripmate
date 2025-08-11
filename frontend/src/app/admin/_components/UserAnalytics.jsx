"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Line, Bar } from 'react-chartjs-2';

export default function UserAnalytics({ adminData }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState(30);

  useEffect(() => {
    loadUserAnalytics();
  }, [timeRange]);

  const loadUserAnalytics = async () => {
    try {
      setLoading(true);
      
      // Calculate date range
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);
      const startDateStr = startDate.toISOString();
      
      // Get user growth data
      const { data: userGrowthData, error: userGrowthError } = await supabase
        .from('trips')
        .select('created_at, created_by')
        .gte('created_at', startDateStr)
        .not('created_by', 'is', null)
        .order('created_at', { ascending: true });
      
      if (userGrowthError) throw userGrowthError;
      
      // Process user growth data
      const growthByDay = {};
      userGrowthData?.forEach(trip => {
        const date = new Date(trip.created_at).toISOString().split('T')[0];
        if (!growthByDay[date]) {
          growthByDay[date] = new Set();
        }
        growthByDay[date].add(trip.created_by);
      });
      
      const user_growth = Object.entries(growthByDay).map(([date, users]) => ({
        date,
        count: users.size
      }));
      
      // Get active users data
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const [dailyUsers, weeklyUsers, monthlyUsers] = await Promise.all([
        supabase
          .from('trips')
          .select('created_by')
          .gte('created_at', oneDayAgo.toISOString())
          .not('created_by', 'is', null),
        supabase
          .from('trips')
          .select('created_by')
          .gte('created_at', sevenDaysAgo.toISOString())
          .not('created_by', 'is', null),
        supabase
          .from('trips')
          .select('created_by')
          .gte('created_at', thirtyDaysAgo.toISOString())
          .not('created_by', 'is', null)
      ]);
      
      if (dailyUsers.error) throw dailyUsers.error;
      if (weeklyUsers.error) throw weeklyUsers.error;
      if (monthlyUsers.error) throw monthlyUsers.error;
      
      const active_users = {
        daily: new Set(dailyUsers.data?.map(t => t.created_by)).size,
        weekly: new Set(weeklyUsers.data?.map(t => t.created_by)).size,
        monthly: new Set(monthlyUsers.data?.map(t => t.created_by)).size
      };
      
      // Get engagement data
      const [tripsCreated, tripMemberships, activeTrips] = await Promise.all([
        supabase
          .from('trips')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', startDateStr),
        supabase
          .from('trip_members')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', startDateStr),
        supabase
          .from('trips')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active')
          .gte('created_at', startDateStr)
      ]);
      
      if (tripsCreated.error) throw tripsCreated.error;
      if (tripMemberships.error) throw tripMemberships.error;
      if (activeTrips.error) throw activeTrips.error;
      
      const user_engagement = [
        { event_type: 'trips_created', count: tripsCreated.count || 0 },
        { event_type: 'trip_memberships', count: tripMemberships.count || 0 },
        { event_type: 'active_trips', count: activeTrips.count || 0 }
      ].filter(item => item.count > 0);
      
      setAnalytics({
        user_growth,
        active_users,
        user_engagement
      });
      
    } catch (error) {
      console.error('Error loading user analytics:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading user analytics</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={loadUserAnalytics}
              className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const userGrowthData = {
    labels: analytics?.user_growth?.map(item => 
      new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    ) || [],
    datasets: [
      {
        label: 'New Users',
        data: analytics?.user_growth?.map(item => item.count) || [],
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const engagementData = {
    labels: analytics?.user_engagement?.map(item => item.event_type) || [],
    datasets: [
      {
        label: 'Event Count',
        data: analytics?.user_engagement?.map(item => item.count) || [],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(20, 184, 166, 0.8)',
          'rgba(251, 146, 60, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(168, 85, 247, 0.8)',
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(139, 92, 246, 1)',
          'rgba(236, 72, 153, 1)',
          'rgba(20, 184, 166, 1)',
          'rgba(251, 146, 60, 1)',
          'rgba(34, 197, 94, 1)',
          'rgba(168, 85, 247, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Time Range Filter */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">User Analytics</h3>
          <div className="flex space-x-2">
            {[7, 30, 90].map(days => (
              <button
                key={days}
                onClick={() => setTimeRange(days)}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  timeRange === days
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {days} days
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active Users Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Daily Active Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics?.active_users?.daily || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Weekly Active Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics?.active_users?.weekly || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Monthly Active Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics?.active_users?.monthly || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth */}
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">User Growth</h4>
          <div className="h-64">
            <Line data={userGrowthData} options={chartOptions} />
          </div>
        </div>

        {/* User Engagement */}
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">User Engagement Events</h4>
          <div className="h-64">
            <Bar data={engagementData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Engagement Details */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="text-md font-medium text-gray-900 mb-4">Engagement Breakdown</h4>
        <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Count
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Percentage
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analytics?.user_engagement?.map((event, index) => {
                const total = analytics.user_engagement.reduce((sum, e) => sum + e.count, 0);
                const percentage = total > 0 ? ((event.count / total) * 100).toFixed(1) : 0;
                return (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {event.event_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {event.count.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {percentage}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Activity Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">User Retention</h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">1-Day Retention</span>
              <span className="text-sm font-medium text-gray-900">
                {analytics?.active_users?.daily && analytics?.active_users?.weekly 
                  ? `${Math.round((analytics.active_users.daily / analytics.active_users.weekly) * 100)}%`
                  : 'N/A'
                }
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">7-Day Retention</span>
              <span className="text-sm font-medium text-gray-900">
                {analytics?.active_users?.weekly && analytics?.active_users?.monthly 
                  ? `${Math.round((analytics.active_users.weekly / analytics.active_users.monthly) * 100)}%`
                  : 'N/A'
                }
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Total Events</span>
              <span className="text-sm font-medium text-gray-900">
                {analytics?.user_engagement?.reduce((sum, e) => sum + e.count, 0).toLocaleString() || 0}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Growth Metrics</h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">New Users (Period)</span>
              <span className="text-sm font-medium text-gray-900">
                {analytics?.user_growth?.reduce((sum, item) => sum + item.count, 0) || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Avg Daily Signups</span>
              <span className="text-sm font-medium text-gray-900">
                {analytics?.user_growth?.length > 0 
                  ? Math.round(analytics.user_growth.reduce((sum, item) => sum + item.count, 0) / analytics.user_growth.length)
                  : 0
                }
              </span>
            </div>
            <div className="flex justify-between items-center">

                
              <span className="text-sm text-gray-500">Peak Signup Day</span>
              <span className="text-sm font-medium text-gray-900">
                {analytics?.user_growth?.length > 0 
                  ? Math.max(...analytics.user_growth.map(item => item.count))
                  : 0
                } users
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
