"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { Line, Bar, Doughnut } from "react-chartjs-2";
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
} from "chart.js";

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

      // Get all users data for better analytics
      const { data: allUsers, error: usersError } = await supabase
        .from("users")
        .select("id, created_at, email, last_login_at")
        .order("created_at", { ascending: true });

      if (usersError) throw usersError;

      // Get user registration data for the time period
      const filteredUsers =
        allUsers?.filter((user) => new Date(user.created_at) >= startDate) ||
        [];

      // Process user growth data by day
      const growthByDay = {};
      filteredUsers.forEach((user) => {
        const date = new Date(user.created_at).toISOString().split("T")[0];
        growthByDay[date] = (growthByDay[date] || 0) + 1;
      });

      // Fill in missing days with 0
      const user_growth = [];
      for (
        let d = new Date(startDate);
        d <= new Date();
        d.setDate(d.getDate() + 1)
      ) {
        const dateStr = d.toISOString().split("T")[0];
        user_growth.push({
          date: dateStr,
          count: growthByDay[dateStr] || 0,
        });
      }

      // Calculate active users based on recent activity
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const dailyActiveUsers =
        allUsers?.filter(
          (user) =>
            user.last_login_at && new Date(user.last_login_at) > oneDayAgo
        ).length || 0;

      const weeklyActiveUsers =
        allUsers?.filter(
          (user) =>
            user.last_login_at && new Date(user.last_login_at) > sevenDaysAgo
        ).length || 0;

      const monthlyActiveUsers =
        allUsers?.filter(
          (user) =>
            user.last_login_at && new Date(user.last_login_at) > thirtyDaysAgo
        ).length || 0;

      const active_users = {
        daily: dailyActiveUsers,
        weekly: weeklyActiveUsers,
        monthly: monthlyActiveUsers,
      };

      // Get engagement data from trips and memberships
      const [tripsData, membersData] = await Promise.all([
        supabase
          .from("trips")
          .select("id, created_at, created_by, status")
          .gte("created_at", startDateStr),
        supabase
          .from("trip_members")
          .select("user_id") // get user_id data to count unique users
          .gte("joined_at", startDateStr)
          .eq("status", "active")
          .not("user_id", "is", null)
      ]);

      if (tripsData.error) throw tripsData.error;
      if (membersData.error) throw membersData.error;

      // Count unique users manually since distinct() is not available
      const uniqueMemberUsers = new Set(membersData.data?.map(m => m.user_id) || []).size;

      const user_engagement = [
        { event_type: "New Registrations", count: filteredUsers.length },
        { event_type: "Trips Created", count: tripsData.data?.length || 0 },
        {
          event_type: "Trip Memberships",
          count: uniqueMemberUsers,
        },
        { event_type: "Active Users (30d)", count: monthlyActiveUsers },
      ];

      // Calculate user distribution by status
      const totalUsers = allUsers?.length || 0;
      const verifiedUsers =
        allUsers?.filter((user) => user.email_confirmed_at).length || 0;
      const activeUsers = monthlyActiveUsers;
      const inactiveUsers = totalUsers - activeUsers;

      const user_status_distribution = {
        "Active (30d)": activeUsers,
        Inactive: inactiveUsers,
        "New (period)": filteredUsers.length,
      };

      setAnalytics({
        user_growth,
        active_users,
        user_engagement,
        user_status_distribution,
        total_users: totalUsers,
        verified_users: verifiedUsers,
      });
    } catch (error) {
      console.error("Error loading user analytics:", error);
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
            <div
              key={i}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 animate-pulse"
            >
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
            <svg
              className="h-5 w-5 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Error loading user analytics
            </h3>
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

  // Core theme colors - matching TripAnalytics
  const primaryColor = "#3B82F6"; // Blue-500
  const secondaryColor = "#6B7280"; // Gray-500
  const accentColor = "#10B981"; // Emerald-500
  const backgroundColor = "#F9FAFB"; // Gray-50
  const textColor = "#111827"; // Gray-900
  const lightTextColor = "#6B7280"; // Gray-500

  // Prepare chart data with improved styling
  const userGrowthData = {
    labels:
      analytics?.user_growth?.map((item) =>
        new Date(item.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      ) || [],
    datasets: [
      {
        label: "New Users",
        data: analytics?.user_growth?.map((item) => item.count) || [],
        borderColor: accentColor,
        backgroundColor: `${accentColor}15`, // 15% opacity
        borderWidth: 3,
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: "#ffffff",
        pointBorderColor: accentColor,
        pointBorderWidth: 2,
        pointHoverBackgroundColor: accentColor,
        pointHoverBorderColor: "#ffffff",
        pointHoverBorderWidth: 3,
      },
    ],
  };

  const engagementData = {
    labels: analytics?.user_engagement?.map((item) => item.event_type) || [],
    datasets: [
      {
        label: "Event Count",
        data: analytics?.user_engagement?.map((item) => item.count) || [],
        backgroundColor: [
          `${primaryColor}E6`, // Blue with opacity
          `${accentColor}E6`, // Emerald with opacity
          "#F59E0BE6", // Amber with opacity
          "#8B5CF6E6", // Violet with opacity
        ],
        borderColor: [primaryColor, accentColor, "#F59E0B", "#8B5CF6"],
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  const statusData = {
    labels: Object.keys(analytics?.user_status_distribution || {}),
    datasets: [
      {
        data: Object.values(analytics?.user_status_distribution || {}),
        backgroundColor: [
          `${accentColor}E6`, // Active - emerald
          "#9CA3AFE6", // Inactive - gray
          `${primaryColor}E6`, // New - blue
        ],
        borderColor: [accentColor, "#9CA3AF", primaryColor],
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
      mode: "index",
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(17, 24, 39, 0.95)",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        borderColor: accentColor,
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
            weight: "500",
          },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: "#F3F4F6",
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
            weight: "500",
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
        backgroundColor: "rgba(17, 24, 39, 0.95)",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
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
            weight: "500",
          },
          maxRotation: 45,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: "#F3F4F6",
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
            weight: "500",
          },
          padding: 8,
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "65%",
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          padding: 20,
          usePointStyle: true,
          pointStyle: "circle",
          font: {
            size: 12,
            weight: "500",
          },
          color: textColor,
        },
      },
      tooltip: {
        backgroundColor: "rgba(17, 24, 39, 0.95)",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
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
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              User Analytics
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              User engagement and growth insights
            </p>
          </div>
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {[
              { days: 7, label: "7d" },
              { days: 30, label: "30d" },
              { days: 90, label: "90d" },
            ].map(({ days, label }) => (
              <button
                key={days}
                onClick={() => setTimeRange(days)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  timeRange === days
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-emerald-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <div className="ml-4 min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-500 truncate">
                Daily Active
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics?.active_users?.daily || 0}
              </p>
              <p className="text-xs text-gray-400 mt-1">Last 24 hours</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
            <div className="ml-4 min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-500 truncate">
                Weekly Active
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics?.active_users?.weekly || 0}
              </p>
              <p className="text-xs text-gray-400 mt-1">Last 7 days</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
            </div>
            <div className="ml-4 min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-500 truncate">
                Monthly Active
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics?.active_users?.monthly || 0}
              </p>
              <p className="text-xs text-gray-400 mt-1">Last 30 days</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
              </div>
            </div>
            <div className="ml-4 min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-500 truncate">
                Total Users
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics?.total_users || 0}
              </p>
              <p className="text-xs text-gray-400 mt-1">All time</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* User Growth Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                User Growth
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                New user registrations over time
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
              <span className="text-sm text-gray-600">New Users</span>
            </div>
          </div>
          <div className="h-48 sm:h-64">
            <Line data={userGrowthData} options={lineChartOptions} />
          </div>
        </div>

        {/* User Status Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                User Status
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Activity distribution
              </p>
            </div>
          </div>
          <div className="h-48 sm:h-64">
            <Doughnut data={statusData} options={doughnutOptions} />
          </div>
        </div>

        {/* User Engagement */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-md transition-shadow duration-200 xl:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                User Engagement
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Activity metrics breakdown
              </p>
            </div>
          </div>
          <div className="h-48 sm:h-64">
            <Bar data={engagementData} options={barChartOptions} />
          </div>
        </div>
      </div>

      {/* Detailed Analytics Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* Engagement Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">
              Engagement Breakdown
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Detailed activity metrics
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event Type
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Count
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Percentage
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analytics?.user_engagement?.map((event, index) => {
                  const total = analytics.user_engagement.reduce(
                    (sum, e) => sum + e.count,
                    0
                  );
                  const percentage =
                    total > 0 ? ((event.count / total) * 100).toFixed(1) : 0;
                  return (
                    <tr
                      key={index}
                      className="hover:bg-gray-50 transition-colors duration-150"
                    >
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {event.event_type}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {event.count.toLocaleString()}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500 min-w-[3rem]">
                            {percentage}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Insights */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">
              User Insights
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Key user metrics and trends
            </p>
          </div>
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-500">
                1-Day Retention Rate
              </span>
              <span className="text-sm font-medium text-gray-900">
                {analytics?.active_users?.daily &&
                analytics?.active_users?.weekly
                  ? `${Math.round(
                      (analytics.active_users.daily /
                        analytics.active_users.weekly) *
                        100
                    )}%`
                  : "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-500">
                7-Day Retention Rate
              </span>
              <span className="text-sm font-medium text-gray-900">
                {analytics?.active_users?.weekly &&
                analytics?.active_users?.monthly
                  ? `${Math.round(
                      (analytics.active_users.weekly /
                        analytics.active_users.monthly) *
                        100
                    )}%`
                  : "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-500">New Users (Period)</span>
              <span className="text-sm font-medium text-gray-900">
                {analytics?.user_growth?.reduce(
                  (sum, item) => sum + item.count,
                  0
                ) || 0}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-500">Avg Daily Signups</span>
              <span className="text-sm font-medium text-gray-900">
                {analytics?.user_growth?.length > 0
                  ? Math.round(
                      analytics.user_growth.reduce(
                        (sum, item) => sum + item.count,
                        0
                      ) / analytics.user_growth.length
                    )
                  : 0}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-500">Peak Signup Day</span>
              <span className="text-sm font-medium text-gray-900">
                {analytics?.user_growth?.length > 0
                  ? Math.max(...analytics.user_growth.map((item) => item.count))
                  : 0}{" "}
                users
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-500">
                Total Engagement Events
              </span>
              <span className="text-sm font-medium text-gray-900">
                {analytics?.user_engagement
                  ?.reduce((sum, e) => sum + e.count, 0)
                  .toLocaleString() || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
