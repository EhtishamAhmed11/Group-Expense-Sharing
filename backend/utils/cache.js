import { getClient } from "../connections/connection.redis.js";

class CacheService {
  constructor() {
    this.client = getClient();
    this.defaultTTL = 7 * 24 * 60 * 60; // default time to live in seconds
  }
  generateUserCacheKey(userId) {
    return `user:${userId}:profile`;
  }
  generateUserExpensesKey(userId) {
    return `user:${userId}:expenses:recent`;
  }

  generateUserStatsKey(userId) {
    return `user:${userId}:expenses:stats`;
  }
  async setUserProfile(userId, userData, ttl = this.defaultTTL) {
    try {
      const key = this.generateUserCacheKey(userId);
      const serializedData = JSON.stringify({
        ...userData,
        cachedAt: new Date().toISOString(),
        expires_at: new Date(Date.now() + ttl * 1000).toISOString(),
      });
      await this.client.setEx(key, ttl, serializedData);
      console.log(`Cached user profile for userId:${userId}`);
      return true;
    } catch (error) {
      console.log(`Error setting user profile cache:${error.message}`);
      return false;
    }
  }

  async getUserProfile(userId) {
    try {
      const key = this.generateUserCacheKey(userId);
      const cachedData = await this.client.get(key);

      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        console.log(`Cache hit for userId:${userId}`);
        return parsedData;
      }
      console.log(`Cache miss for userId:${userId}`);
      return null;
    } catch (error) {
      console.log(`Error getting user profile cache:${error.message}`);
      return null;
    }
  }

  async deleteUserProfile(userId) {
    try {
      const key = this.generateUserCacheKey(userId);
      const result = await this.client.del(key);
      console.log(`Deleted cache for userId:${userId}, result:${result}`);
      return result > 0;
    } catch (error) {
      console.log(`Error deleting user profile cache:${error.message}`);
      return false;
    }
  }
  async isAvailable() {
    try {
      await this.client.ping();
      return true;
    } catch (error) {
      console.log(`Redis not available:${error.message}`);
      return false;
    }
  }
  async invalidateUserCache(userId) {
    try {
      const pattern = `user:${userId}:*`;
      const keys = await this.client.keys(pattern);

      if (keys.length > 0) {
        await this.client.del(keys);
        console.log(
          `Invalidated ${keys.length} cache entries for userId:${userId}`
        );
      }
      return keys.length;
    } catch (error) {
      console.log(`Error invalidating user cache:${error.message}`);
    }
  }

  //expense cache methods
  async invalidateUserExpenseCache(userId) {
    try {
      const keys = [
        this.generateUserExpensesKey(userId),
        this.generateUserStatsKey(userId),
      ];

      if (keys.length > 0) {
        await this.client.del(keys);
        console.log(`Invalidated expense cache for userId:${userId}`);
      }
      return true;
    } catch (error) {
      console.log(`Error invalidating expense cache:${error.message}`);
      return false;
    }
  }
}

export const cacheService = new CacheService();
