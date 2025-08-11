// Client-side API utilities for GlobeTrotter
// All functions use Next.js API routes instead of direct Supabase calls
import { supabase } from './supabase'
import clientCache from './client-cache'
import cache, { cacheKeys } from './cache'

// Cache for session to avoid repeated getSession calls
let sessionCache = null;
let sessionCacheTime = 0;
const SESSION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Get cached session or fetch new one
const getCachedSession = async () => {
  const now = Date.now();
  
  // Return cached session if still valid
  if (sessionCache && (now - sessionCacheTime) < SESSION_CACHE_DURATION) {
    return sessionCache;
  }
  
  // Fetch new session
  const { data: { session } } = await supabase.auth.getSession();
  sessionCache = session;
  sessionCacheTime = now;
  
  return session;
};

// Clear session cache
const clearSessionCache = () => {
  sessionCache = null;
  sessionCacheTime = 0;
};

// Enhanced API request function with caching
const apiRequest = async (endpoint, options = {}) => {
  const startTime = performance.now();
  
  try {
    // Check if this is a cacheable GET request
    const method = options.method || 'GET';
    const cacheKey = options.cacheKey;
    const skipCache = options.skipCache || false;
    
    // Try cache first for GET requests
    if (method === 'GET' && cacheKey && !skipCache) {
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        console.log(`Cache hit: ${endpoint} (${(performance.now() - startTime).toFixed(0)}ms)`);
        return {
          success: true,
          data: cachedData.data,
          message: cachedData.message,
          fromCache: true
        };
      }
    }

    // Get cached session for authenticated requests
    const session = await getCachedSession();
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    // Add authorization header if session exists
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }

    // Add request timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const response = await fetch(`/api${endpoint}`, {
      headers,
      signal: controller.signal,
      ...options
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      // Clear session cache on auth errors
      if (response.status === 401 || response.status === 403) {
        clearSessionCache();
      }
      
      const error = new Error(data.error || 'Request failed');
      error.status = response.status;
      error.errorType = data.errorType;
      throw error;
    }

    const result = {
      success: true,
      data: data.data || data,
      message: data.message
    };

    // Cache successful GET responses
    if (method === 'GET' && cacheKey && !skipCache) {
      cache.set(cacheKey, result, options.cacheTTL);
    }

    // Log slow requests
    const duration = performance.now() - startTime;
    if (duration > 2000) {
      console.warn(`Slow API request: ${endpoint} took ${duration.toFixed(0)}ms`);
    }

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    
    if (error.name === 'AbortError') {
      console.error(`API timeout: ${endpoint} after ${duration.toFixed(0)}ms`);
      return {
        success: false,
        error: 'Request timeout - please check your connection',
        errorType: 'timeout',
        status: 408,
        data: null
      };
    }
    
    console.error(`API Error (${duration.toFixed(0)}ms): ${endpoint}`, error);
    return {
      success: false,
      error: error.message,
      errorType: error.errorType,
      status: error.status,
      data: null
    };
  }
};

// Export the cache clearing function for auth changes
export { clearSessionCache };

// Permission check utility
export const hasPermission = (userRole, permission) => {
  const rolePermissions = {
    Admin: ['*'], // Admin has all permissions
    Manager: [
      'edit_itinerary', 'approve_requests', 'moderate_chat', 'create_invites'
    ],
    Traveller: [
      'view_trip', 'participate_chat', 'use_ai_assistant', 'suggest_edits'
    ]
  }

  if (rolePermissions[userRole]?.includes('*')) return true
  return rolePermissions[userRole]?.includes(permission) || false
}

// =============================================================================
// AUTH API FUNCTIONS
// =============================================================================

export const authApi = {
  // Sign up with email
  signUp: async (email, password, name) => {
    return apiRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name })
    })
  },

  // Sign in with email
  signIn: async (email, password) => {
    return apiRequest('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })
  },

  // Sign out
  signOut: async () => {
    return apiRequest('/auth/signout', {
      method: 'POST'
    })
  },

  // Reset password
  resetPassword: async (email) => {
    return apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    })
  },

  // Update last login (called after successful Supabase auth)
  updateLastLogin: async () => {
    return apiRequest('/auth/update-last-login', {
      method: 'POST'
    })
  }
}

// =============================================================================
// USER API FUNCTIONS
// =============================================================================

export const userApi = {
  // Get user profile
  getProfile: async (userId = null) => {
    const endpoint = userId ? `/users/profile?userId=${userId}` : '/users/profile';
    const cacheKey = clientCache.generateKey('/users/profile', { userId: userId || 'current' });
    
    // Try cache first
    const cachedResult = clientCache.get(cacheKey);
    if (cachedResult) {
      console.log('Cache hit for profile:', userId || 'current');
      return cachedResult;
    }
    
    const result = await apiRequest(endpoint);
    
    // Cache successful results
    if (result.success) {
      clientCache.set(cacheKey, result, 5 * 60 * 1000); // 5 minutes
    }
    
    return result;
  },

  // Update user profile
  updateProfile: async (updates) => {
    const result = await apiRequest('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    
    // Clear profile cache on successful update
    if (result.success) {
      clientCache.clearPattern('/users/profile:');
    }
    
    return result;
  },

  // Get user's trips
  getUserTrips: async (page = 1, limit = 10) => {
    const cacheKey = clientCache.generateKey('/users/trips', { page, limit });
    
    // Try cache first
    const cachedResult = clientCache.get(cacheKey);
    if (cachedResult) {
      console.log('Cache hit for user trips:', page, limit);
      return cachedResult;
    }
    
    const result = await apiRequest(`/users/trips?page=${page}&limit=${limit}`);
    
    // Cache successful results
    if (result.success) {
      clientCache.set(cacheKey, result, 3 * 60 * 1000); // 3 minutes
    }
    
    return result;
  }
}

// =============================================================================
// TRIP API FUNCTIONS
// =============================================================================

export const tripApi = {
  // Get public trips with filters
  getTrips: async (filters = {}, page = 1, limit = 12) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters
    });
    
    if (filters.tags && Array.isArray(filters.tags)) {
      params.set('tags', filters.tags.join(','));
    }
    
    const cacheKey = clientCache.generateKey('/trips', { ...filters, page, limit });
    
    // Try cache first
    const cachedResult = clientCache.get(cacheKey);
    if (cachedResult) {
      console.log('Cache hit for trips:', cacheKey);
      return cachedResult;
    }
    
    const result = await apiRequest(`/trips?${params.toString()}`);
    
    // Cache successful results
    if (result.success) {
      clientCache.set(cacheKey, result, 2 * 60 * 1000); // 2 minutes
    }
    
    return result;
  },

  // Get trip by ID
  getTripById: async (tripId) => {
    const cacheKey = clientCache.generateKey('/trips', { id: tripId });
    
    // Try cache first
    const cachedResult = clientCache.get(cacheKey);
    if (cachedResult) {
      console.log('Cache hit for trip:', tripId);
      return cachedResult;
    }
    
    const result = await apiRequest(`/trips/${tripId}`);
    
    // Cache successful results
    if (result.success) {
      clientCache.set(cacheKey, result, 5 * 60 * 1000); // 5 minutes
    }
    
    return result;
  },

  // Create new trip
  createTrip: async (tripData) => {
    const result = await apiRequest('/trips', {
      method: 'POST',
      body: JSON.stringify(tripData)
    });
    
    // Clear trip caches on successful creation
    if (result.success) {
      clientCache.clearPattern('^/trips:'); // Clear all trip caches
    }
    
    return result;
  },

  // Update trip
  updateTrip: async (tripId, updates) => {
    const result = await apiRequest(`/trips/${tripId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    
    // Clear caches on successful update
    if (result.success) {
      cache.deleteTrip(tripId);
      cache.clearTrips();
    }
    
    return result;
  },

  // Delete trip
  deleteTrip: async (tripId) => {
    const result = await apiRequest(`/trips/${tripId}`, {
      method: 'DELETE'
    });
    
    // Clear caches on successful deletion
    if (result.success) {
      cache.deleteTrip(tripId);
      cache.clearTrips();
    }
    
    return result;
  },

  // Join trip request
  requestToJoin: async (tripId, message = '') => {
    return apiRequest(`/trips/${tripId}/join`, {
      method: 'POST',
      body: JSON.stringify({ message })
    })
  },

  // Get trip members
  getTripMembers: async (tripId) => {
    return apiRequest(`/trips/${tripId}/members`)
  },

  // Add member to trip
  addMember: async (tripId, userId, role = 'Traveller') => {
    return apiRequest(`/trips/${tripId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId, role })
    })
  },

  // Update member role
  updateMemberRole: async (tripId, memberId, role) => {
    return apiRequest(`/trips/${tripId}/members/${memberId}`, {
      method: 'PUT',
      body: JSON.stringify({ role })
    })
  },

  // Remove member from trip
  removeMember: async (tripId, memberId) => {
    return apiRequest(`/trips/${tripId}/members/${memberId}`, {
      method: 'DELETE'
    })
  }
}

// =============================================================================
// ITINERARY API FUNCTIONS
// =============================================================================

export const itineraryApi = {
  // Get trip itinerary
  getItinerary: async (tripId) => {
    return apiRequest(`/trips/${tripId}/itinerary`)
  },

  // Add itinerary item
  addItem: async (tripId, itemData) => {
    return apiRequest(`/trips/${tripId}/itinerary`, {
      method: 'POST',
      body: JSON.stringify(itemData)
    })
  },

  // Update itinerary item
  updateItem: async (tripId, itemId, updates) => {
    return apiRequest(`/trips/${tripId}/itinerary/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    })
  },

  // Delete itinerary item
  deleteItem: async (tripId, itemId) => {
    return apiRequest(`/trips/${tripId}/itinerary/${itemId}`, {
      method: 'DELETE'
    })
  }
}

// =============================================================================
// MESSAGES API FUNCTIONS
// =============================================================================

export const messagesApi = {
  // Get trip messages
  getMessages: async (tripId, page = 1, limit = 50) => {
    return apiRequest(`/trips/${tripId}/messages?page=${page}&limit=${limit}`)
  },

  // Send message
  sendMessage: async (tripId, messageData) => {
    return apiRequest(`/trips/${tripId}/messages`, {
      method: 'POST',
      body: JSON.stringify(messageData)
    })
  }
}

// =============================================================================
// INVITES API FUNCTIONS
// =============================================================================

export const invitesApi = {
  // Create invite
  createInvite: async (tripId, inviteSettings) => {
    return apiRequest(`/trips/${tripId}/invites`, {
      method: 'POST',
      body: JSON.stringify(inviteSettings)
    })
  },

  // Get trip invites
  getTripInvites: async (tripId) => {
    return apiRequest(`/trips/${tripId}/invites`)
  },

  // Get invite details
  getInviteDetails: async (inviteCode) => {
    return apiRequest(`/invites/${inviteCode}`)
  },

  // Join via invite
  joinViaInvite: async (inviteCode, password = '') => {
    return apiRequest(`/invites/${inviteCode}`, {
      method: 'POST',
      body: JSON.stringify({ password })
    })
  }
}

// =============================================================================
// NOTIFICATIONS API FUNCTIONS
// =============================================================================

export const notificationsApi = {
  // Get notifications
  getNotifications: async (page = 1, limit = 20, unreadOnly = false) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    })
    
    if (unreadOnly) {
      params.set('unread', 'true')
    }
    
    return apiRequest(`/notifications?${params.toString()}`)
  },

  // Mark notifications as read/unread
  updateNotifications: async (notificationIds, markAsRead = true) => {
    return apiRequest('/notifications', {
      method: 'PUT',
      body: JSON.stringify({ notificationIds, markAsRead })
    })
  }
}

// =============================================================================
// EXPORT ALL APIs
// =============================================================================

export default {
  authApi,
  userApi,
  tripApi,
  itineraryApi,
  messagesApi,
  invitesApi,
  notificationsApi,
  hasPermission
}
