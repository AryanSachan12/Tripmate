// Client-side cache for better performance
class ClientCache {
  constructor() {
    this.cache = new Map();
    this.expirationTimes = new Map();
  }

  set(key, value, ttl = 5 * 60 * 1000) { // 5 minutes default TTL
    this.cache.set(key, value);
    this.expirationTimes.set(key, Date.now() + ttl);
  }

  get(key) {
    const expiration = this.expirationTimes.get(key);
    if (expiration && Date.now() > expiration) {
      this.delete(key);
      return null;
    }
    return this.cache.get(key) || null;
  }

  delete(key) {
    this.cache.delete(key);
    this.expirationTimes.delete(key);
  }

  clear() {
    this.cache.clear();
    this.expirationTimes.clear();
  }

  has(key) {
    const expiration = this.expirationTimes.get(key);
    if (expiration && Date.now() > expiration) {
      this.delete(key);
      return false;
    }
    return this.cache.has(key);
  }

  size() {
    return this.cache.size;
  }

  // Clean up expired entries
  cleanup() {
    const now = Date.now();
    for (const [key, expiration] of this.expirationTimes.entries()) {
      if (now > expiration) {
        this.delete(key);
      }
    }
  }
}

// Global cache instances
const tripCache = new ClientCache();
const userCache = new ClientCache();
const generalCache = new ClientCache();

// Cache keys factory
export const cacheKeys = {
  trip: (id) => `trip:${id}`,
  trips: (filters = {}) => `trips:${JSON.stringify(filters)}`,
  user: (id) => `user:${id}`,
  userProfile: (id) => `user:profile:${id}`,
  userTrips: (id) => `user:trips:${id}`,
  tripMembers: (tripId) => `trip:members:${tripId}`,
  tripMessages: (tripId) => `trip:messages:${tripId}`,
  notifications: (userId) => `notifications:${userId}`
};

// Cache utilities
export const cache = {
  // Trip-related caching
  setTrip: (id, data) => tripCache.set(cacheKeys.trip(id), data),
  getTrip: (id) => tripCache.get(cacheKeys.trip(id)),
  deleteTrip: (id) => tripCache.delete(cacheKeys.trip(id)),
  
  setTrips: (filters, data) => tripCache.set(cacheKeys.trips(filters), data),
  getTrips: (filters) => tripCache.get(cacheKeys.trips(filters)),
  clearTrips: () => {
    // Clear all trip list caches
    for (const key of tripCache.cache.keys()) {
      if (key.startsWith('trips:')) {
        tripCache.delete(key);
      }
    }
  },

  // User-related caching
  setUser: (id, data) => userCache.set(cacheKeys.user(id), data),
  getUser: (id) => userCache.get(cacheKeys.user(id)),
  deleteUser: (id) => userCache.delete(cacheKeys.user(id)),
  
  setUserProfile: (id, data) => userCache.set(cacheKeys.userProfile(id), data),
  getUserProfile: (id) => userCache.get(cacheKeys.userProfile(id)),
  deleteUserProfile: (id) => userCache.delete(cacheKeys.userProfile(id)),

  // General caching
  set: (key, data, ttl) => generalCache.set(key, data, ttl),
  get: (key) => generalCache.get(key),
  delete: (key) => generalCache.delete(key),
  has: (key) => generalCache.has(key),

  // Cache management
  clear: () => {
    tripCache.clear();
    userCache.clear();
    generalCache.clear();
  },
  
  cleanup: () => {
    tripCache.cleanup();
    userCache.cleanup();
    generalCache.cleanup();
  },

  // Cache stats
  stats: () => ({
    trips: tripCache.size(),
    users: userCache.size(),
    general: generalCache.size(),
    total: tripCache.size() + userCache.size() + generalCache.size()
  })
};

// Auto cleanup every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    cache.cleanup();
  }, 5 * 60 * 1000);
}

// Clear cache on page unload to prevent memory leaks
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    cache.clear();
  });
}

export default cache;
