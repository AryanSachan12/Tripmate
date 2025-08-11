"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";

export default function UserManagement({ adminData }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [insurancePredictions, setInsurancePredictions] = useState({});
  const [predictionLoading, setPredictionLoading] = useState({});
  const usersPerPage = 20;

  useEffect(() => {
    loadUsers();
    loadInsurancePredictions();
  }, [currentPage, sortBy, sortOrder, searchTerm]);

  const loadInsurancePredictions = async () => {
    try {
      const response = await fetch('/api/insurance-prediction');
      if (response.ok) {
        const data = await response.json();
        const predictionsMap = {};
        data.predictions?.forEach(pred => {
          predictionsMap[pred.user_id] = pred;
        });
        setInsurancePredictions(predictionsMap);
      } else {
        console.error('Failed to load insurance predictions:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error loading insurance predictions:', error);
      // Don't show alert for this error as it's not critical for basic functionality
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from("users")
        .select("id, email, created_at, last_login_at", { count: "exact" }) // include last_login_at
        .order(sortBy === "email" ? "email" : sortBy, {
          ascending: sortOrder === "asc",
        })
        .range(
          (currentPage - 1) * usersPerPage,
          currentPage * usersPerPage - 1
        );

      if (searchTerm) {
        query = query.ilike("email", `%${searchTerm}%`); // search by email
      }

      const { data, error, count } = await query;
      if (error) throw error;

      // Transform data (though if using users table directly, you might not need to dedupe)
      const uniqueUsers = [];
      const seenIds = new Set();

      data?.forEach((user) => {
        if (!seenIds.has(user.id)) {
          seenIds.add(user.id);
          uniqueUsers.push({
            id: user.id,
            email: user.email || "unknown@example.com",
            created_at: user.created_at,
            last_login_at: user.last_login_at,
            raw_user_meta_data: {},
            email_confirmed_at: user.created_at,
          });
        }
      });

      setUsers(uniqueUsers);
      setTotalUsers(count || seenIds.size);
    } catch (error) {
      console.error("Error loading users:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleViewUser = async (user) => {
    setSelectedUser(user);
    
    // Load additional user details
    try {
      // Get user's trips
      const { data: trips, error: tripsError } = await supabase
        .from('trips')
        .select('id, title, location, status, created_at')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Get user's trip memberships
      const { data: memberships, error: membershipsError } = await supabase
        .from('trip_members')
        .select('trip_id, status, joined_at, trips(title, location)')
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false })
        .limit(5);

      setSelectedUser({
        ...user,
        trips: trips || [],
        memberships: memberships || [],
        tripsError,
        membershipsError
      });
    } catch (error) {
      console.error('Error loading user details:', error);
      setSelectedUser({
        ...user,
        trips: [],
        memberships: [],
        detailsError: error.message
      });
    }
    
    setShowUserModal(true);
  };

  const handleSuspendUser = (user) => {
    setSelectedUser(user);
    setShowSuspendModal(true);
  };

  const confirmSuspendUser = async () => {
    if (!selectedUser) return;
    
    try {
      setActionLoading(true);
      
      // In a real implementation, you would update a user status field
      // For now, we'll just log the action and show a success message
      console.log('Suspending user:', selectedUser.email);
      
      // You could update a user status field like this:
      // const { error } = await supabase
      //   .from('users')
      //   .update({ is_suspended: true, suspended_at: new Date().toISOString() })
      //   .eq('id', selectedUser.id);
      
      // if (error) throw error;
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert(`User ${selectedUser.email} has been suspended.`);
      
      setShowSuspendModal(false);
      setSelectedUser(null);
      loadUsers(); // Refresh the list
    } catch (error) {
      console.error('Error suspending user:', error);
      alert('Failed to suspend user: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleInsurancePrediction = async (user) => {
    if (predictionLoading[user.id]) return;
    
    try {
      setPredictionLoading(prev => ({...prev, [user.id]: true}));
      
      // Generate random user data
      const randomData = generateRandomUserData();
      
      const response = await fetch('/api/insurance-prediction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          userData: randomData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Prediction failed');
      }

      const data = await response.json();
      
      // Update local predictions state
      setInsurancePredictions(prev => ({
        ...prev,
        [user.id]: data.data
      }));

      return data; // Return the result for bulk processing
      
    } catch (error) {
      console.error('Error making insurance prediction:', error);
      throw error; // Re-throw for bulk processing to handle
    } finally {
      setPredictionLoading(prev => ({...prev, [user.id]: false}));
    }
  };

  const handleSinglePrediction = async (user) => {
    try {
      await handleInsurancePrediction(user);
      // Success - no need for alert as the UI updates immediately
    } catch (error) {
      alert('Failed to make prediction: ' + error.message);
    }
  };

  const generateRandomUserData = () => {
    return {
      age: Math.floor(Math.random() * (50 - 18 + 1)) + 18, // Age: 18-50
      graduateOrNot: Math.random() > 0.4 ? 1 : 0, // 60% chance of being graduate
      annualIncome: Math.floor(Math.random() * (1000000 - 500000 + 1)) + 500000,
      familyMembers: Math.floor(Math.random() * 6) + 1, // Family members: 1-6
      frequentFlyer: Math.random() > 0.7 ? 1 : 0, // 30% chance of being frequent flyer
      everTravelledAbroad: Math.random() > 0.5 ? 1 : 0, // 50% chance of international travel
    };
  };

  const handleBulkPredict = async () => {
    const usersWithoutPredictions = users.filter(user => !insurancePredictions[user.id]);
    
    if (usersWithoutPredictions.length === 0) {
      alert('All users already have predictions!');
      return;
    }

    if (!confirm(`Generate predictions for ${usersWithoutPredictions.length} users?`)) {
      return;
    }

    const batchSize = 3; // Process 3 users at a time to avoid overwhelming the API
    for (let i = 0; i < usersWithoutPredictions.length; i += batchSize) {
      const batch = usersWithoutPredictions.slice(i, i + batchSize);
      
      // Set loading state for batch
      setPredictionLoading(prev => {
        const newState = { ...prev };
        batch.forEach(user => {
          newState[user.id] = true;
        });
        return newState;
      });

      // Process batch in parallel
      const promises = batch.map(user => 
        handleInsurancePrediction(user).catch(error => {
          console.error(`Failed to predict for user ${user.email}:`, error);
          return null;
        })
      );

      await Promise.all(promises);
      
      // Small delay between batches
      if (i + batchSize < usersWithoutPredictions.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    alert(`Bulk prediction completed for ${usersWithoutPredictions.length} users!`);
  };

  const totalPages = Math.ceil(totalUsers / usersPerPage);

  const SortIcon = ({ column }) => {
    if (sortBy !== column) {
      return (
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M8 9l4-4 4 4m0 6l-4 4-4-4"
          />
        </svg>
      );
    }

    return sortOrder === "asc" ? (
      <svg
        className="w-4 h-4 text-gray-700"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M5 15l7-7 7 7"
        />
      </svg>
    ) : (
      <svg
        className="w-4 h-4 text-gray-700"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M19 9l-7 7-7-7"
        />
      </svg>
    );
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
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
              Error loading users
            </h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={loadUsers}
              className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">User Management</h3>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBulkPredict}
              disabled={Object.values(predictionLoading).some(loading => loading)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Bulk Predict All
            </button>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search users by email..."
                value={searchTerm}
                onChange={handleSearch}
                className="block w-64 pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="text-sm text-gray-500">
          Showing {(currentPage - 1) * usersPerPage + 1} to{" "}
          {Math.min(currentPage * usersPerPage, totalUsers)} of {totalUsers}{" "}
          users
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  onClick={() => handleSort("email")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center space-x-1">
                    <span>Email</span>
                    <SortIcon column="email" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th
                  onClick={() => handleSort("created_at")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center space-x-1">
                    <span>Joined</span>
                    <SortIcon column="created_at" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("last_login_at")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center space-x-1">
                    <span>Last Login</span>
                    <SortIcon column="last_login_at" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Insurance Prediction
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                // Loading skeleton
                [...Array(usersPerPage)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user, index) => (
                  <tr
                    key={user.id}
                    className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {user.email?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.email}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.raw_user_meta_data?.name || "No name set"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.email_confirmed_at
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {user.email_confirmed_at ? "Verified" : "Pending"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.last_login_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {insurancePredictions[user.id] ? (
                        <div className="flex flex-col space-y-1">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              insurancePredictions[user.id].prediction === 1
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {insurancePredictions[user.id].prediction === 1 ? "Will Buy" : "Won't Buy"}
                          </span>
                          <span className="text-xs text-gray-500">
                            {(insurancePredictions[user.id].probability * 100).toFixed(1)}% confidence
                          </span>
                          <div className="text-xs text-gray-400 mt-1">
                            Age: {insurancePredictions[user.id].age}, 
                            Income: ${insurancePredictions[user.id].annual_income?.toLocaleString()}
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleSinglePrediction(user)}
                          disabled={predictionLoading[user.id]}
                          className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded border transition-colors ${
                            predictionLoading[user.id]
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-300"
                              : "border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400"
                          }`}
                        >
                          {predictionLoading[user.id] ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Predicting...
                            </>
                          ) : (
                            "Generate Prediction"
                          )}
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button 
                        onClick={() => handleViewUser(user)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        View
                      </button>
                      {adminData?.role === "super_admin" && (
                        <button 
                          onClick={() => handleSuspendUser(user)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Suspend
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between items-center">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              <div className="hidden md:flex">
                <span className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
              </div>

              <button
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
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
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                  />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{totalUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">
                Verified Users
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter((u) => u.email_confirmed_at).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-yellow-600"
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
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">
                Pending Verification
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter((u) => !u.email_confirmed_at).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
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
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">
                Recent Signups
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {
                  users.filter((u) => {
                    const dayAgo = new Date();
                    dayAgo.setDate(dayAgo.getDate() - 1);
                    return new Date(u.created_at) > dayAgo;
                  }).length
                }
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
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
                    d="M9 12l2 2 4-4m5.25-2.25L21 9l-3 3-3-3 1.5-1.5z"
                  />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">
                Insurance Predictions
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {Object.keys(insurancePredictions).length}
              </p>
              <div className="text-xs text-gray-500 mt-1">
                <span className="text-green-600">
                  {Object.values(insurancePredictions).filter(p => p.prediction === 1).length} will buy
                </span>
                {" • "}
                <span className="text-red-600">
                  {Object.values(insurancePredictions).filter(p => p.prediction === 0).length} won't buy
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">User Details</h3>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
              
              <div className="space-y-6">
                {/* User Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">User Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-500">Email:</span>
                      <p className="text-gray-900">{selectedUser.email}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">Status:</span>
                      <p className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedUser.email_confirmed_at
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}>
                        {selectedUser.email_confirmed_at ? "Verified" : "Pending"}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">Joined:</span>
                      <p className="text-gray-900">{formatDate(selectedUser.created_at)}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">Last Login:</span>
                      <p className="text-gray-900">{formatDate(selectedUser.last_login_at)}</p>
                    </div>
                  </div>
                </div>

                {/* User's Trips */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Created Trips ({selectedUser.trips?.length || 0})</h4>
                  {selectedUser.trips?.length > 0 ? (
                    <div className="space-y-2">
                      {selectedUser.trips.map((trip) => (
                        <div key={trip.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <div>
                            <p className="font-medium text-gray-900">{trip.title}</p>
                            <p className="text-sm text-gray-500">{trip.location}</p>
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              trip.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {trip.status || 'draft'}
                            </span>
                            <p className="text-xs text-gray-500 mt-1">{formatDate(trip.created_at)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No trips created</p>
                  )}
                </div>

                {/* Trip Memberships */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Trip Memberships ({selectedUser.memberships?.length || 0})</h4>
                  {selectedUser.memberships?.length > 0 ? (
                    <div className="space-y-2">
                      {selectedUser.memberships.map((membership, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <div>
                            <p className="font-medium text-gray-900">{membership.trips?.title || 'Unknown Trip'}</p>
                            <p className="text-sm text-gray-500">{membership.trips?.location || 'Unknown Location'}</p>
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              membership.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {membership.status}
                            </span>
                            <p className="text-xs text-gray-500 mt-1">{formatDate(membership.joined_at)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No trip memberships</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Suspend User Modal */}
      {showSuspendModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-2">Suspend User</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to suspend <strong>{selectedUser.email}</strong>? 
                  This action will prevent them from accessing the platform.
                </p>
              </div>
              <div className="flex justify-center space-x-4 px-4 py-3">
                <button
                  onClick={() => setShowSuspendModal(false)}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSuspendUser}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center"
                >
                  {actionLoading && (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {actionLoading ? 'Suspending...' : 'Suspend User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
