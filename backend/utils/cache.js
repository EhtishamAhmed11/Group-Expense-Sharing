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

  generateUserGroupsKey(userId) {
    return `user:${userId}:groups`;
  }
  generateGroupCacheKey(groupId) {
    return `group:${groupId}:details`;
  }
  generateGroupMembersKey(groupId) {
    return `group:${groupId}:members`;
  }
  generateGroupExpensesKey(groupId) {
    return `group:${groupId}:expenses:recent`;
  }
  generateGroupStatsKey(groupId) {
    return `group:${groupId}:stats`;
  }
  generateGroupBalancesKey(groupId) {
    return `group:${groupId}:balances`;
  }
  generateGroupInviteKey(inviteCode) {
    return `invite:${inviteCode}:group`;
  }
  generateMembershipKey(userId, groupId) {
    return `membership:${userId}:${groupId}`;
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
  //group cache Methods

  async setUserGroups(userId, groupsData, ttl = this.defaultTTL) {
    try {
      const key = this.generateUserGroupsKey(userId);
      const serializedData = JSON.stringify({
        groups: groupsData,
        cachedAt: new Date().toISOString(),
        expires_at: new Date(Date.now() + ttl * 1000).toISOString(),
      });
      await this.client.setEx(key, ttl, serializedData);
      console.log(`Cached User groups for userId:${userId}`);
      return true;
    } catch (error) {
      console.log(`Error setting user groups cache:${error.message}`);
      return false;
    }
  }
  async getUserGroups(userId) {
    try {
      const key = this.generateUserGroupsKey(userId);
      const cachedData = await this.client.get(key);
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        console.log(`Cache hit user groups userId:${userId}`);
        return parsedData.groups;
      }
      console.log(`Cache miss for user groups userId:${userId}`);
      return null;
    } catch (error) {
      console.log(`Error getting user groups cache:${error.message}`);
      return null;
    }
  }
  async setGroupDetails(groupId, groupData, ttl = this.defaultTTL) {
    try {
      const key = this.generateGroupCacheKey(groupId);

      const serializedData = JSON.stringify({
        ...groupData,
        cachedAt: new Date().toISOString(),
        expires_at: new Date(Date.now() + ttl * 1000).toISOString(),
      });
      await this.client.setEx(key, ttl, serializedData);
      console.log(`Cached group details for groupId:${groupId}`);
      return true;
    } catch (error) {
      console.log(`Error setting group details cache:${error.message}`);
      return false;
    }
  }

  async getGroupDetails(groupId) {
    try {
      const key = this.generateGroupCacheKey(groupId);
      const cachedData = await this.client.get(key);
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        console.log(`Cache hit for group details groupId:${groupId}`);
        return parsedData;
      }
      console.log(`Cache miss for group details groupId:${groupId}`);
      return null;
    } catch (error) {
      console.log(`Error getting group details cache:${error.message}`);
      return null;
    }
  }

  async setGroupMembers(groupId, membersData, ttl = this.defaultTTL) {
    try {
      const key = this.generateGroupMembersKey(groupId);
      const serializedData = JSON.stringify({
        members: membersData,
        cachedAt: new Date().toISOString(),
        expires_at: new Date(Date.now() + ttl * 1000).toISOString(),
      });
      await this.client.setEx(key, ttl, serializedData);
      console.log(`Cached group members for groupId:${groupId}`);
      return true;
    } catch (error) {
      console.log(`Error setting group members cache:${error.message}`);
      return false;
    }
  }
  async getGroupMembers(groupId) {
    try {
      const key = this.generateGroupMembersKey(groupId);
      const cachedData = await this.client.get(key);

      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        console.log(`Cache hit for group members groupId:${groupId}`);
        return parsedData.members;
      }
      console.log(`Cache miss for group members groupId:${groupId}`);
      return null;
    } catch (error) {
      console.log(`Error getting group members cache:${error.message}`);
      return null;
    }
  }

  async setGroupInviteCache(inviteCode, groupData, ttl = 24 * 60 * 60) {
    // 24 hour TTL for invites
    try {
      const key = this.generateGroupInviteKey(inviteCode);
      const serializedData = JSON.stringify({
        ...groupData,
        cachedAt: new Date().toISOString(),
        expires_at: new Date(Date.now() + ttl * 1000).toISOString(),
      });
      await this.client.setEx(key, ttl, serializedData);
      console.log(`Cached group invite for inviteCode:${inviteCode}`);
      return true;
    } catch (error) {
      console.log(`Error setting group invite cache:${error.message}`);
      return false;
    }
  }

  async getGroupByInvite(inviteCode) {
    try {
      const key = this.generateGroupInviteKey(inviteCode);
      const cachedData = await this.client.get(key);

      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        console.log(`Cache hit for group invite:${inviteCode}`);
        return parsedData;
      }
      console.log(`Cache miss for group invite:${inviteCode}`);
      return null;
    } catch (error) {
      console.log(`Error getting group invite cache:${error.message}`);
      return null;
    }
  }

  async setMembershipCache(userId, groupId, membershipData, ttl = 30 * 60) {
    try {
      const key = this.generateMembershipKey(userId, groupId);
      const serializedData = JSON.stringify({
        ...membershipData,
        cachedAt: new Date().toISOString(),
        expires_at: new Date(Date.now() + ttl * 1000).toISOString(),
      });
      await this.client.setEx(key, ttl, serializedData);
      console.log(`Cached membership for userId:${userId} groupId:${groupId}`);
      return true;
    } catch (error) {
      console.log(`Error setting membership cache:${error.message}`);
      return false;
    }
  }
  async getMembershipCache(userId, groupId) {
    try {
      const key = this.generateMembershipKey(userId, groupId);
      const cachedData = await this.client.get(key);
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        console.log(
          `Cache hit for membership userId:${userId} groupId:${groupId}`
        );
        return parsedData;
      }
      console.log(
        `Cache miss for membership userId:${userId} groupId:${groupId}`
      );
      return null;
    } catch (error) {
      console.log(`Error getting membership cache:${error.message}`);
      return null;
    }
  }

  //----------

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
  async invalidateUserGroupCache(userId) {
    try {
      const key = this.generateUserGroupsKey(userId);
      const result = await this.client.del(key);
      console.log(`Invalidated user groups cache for userId:${userId}`);
      return result > 0;
    } catch (error) {
      console.log(`Error invalidating user groups cache:${error.message}`);
      return false;
    }
  }

  async invalidateGroupCache(groupId) {
    try {
      const pattern = `group:${groupId}:*`;
      const keys = await this.client.keys(pattern);

      if (keys.length > 0) {
        await this.client.del(keys);
        console.log(
          `Invalidated ${keys.length} group cache entries for groupId:${groupId}`
        );
      }
      return keys.length;
    } catch (error) {
      console.log(`Error invalidating group cache:${error.message}`);
      return 0;
    }
  }

  async invalidateGroupMembersCache(groupId, memberUserIds = []) {
    try {
      const promises = [];

      // Invalidate group-specific caches
      promises.push(this.client.del(this.generateGroupMembersKey(groupId)));
      promises.push(this.client.del(this.generateGroupCacheKey(groupId)));

      // Invalidate each member's user groups cache
      for (const userId of memberUserIds) {
        promises.push(this.client.del(this.generateUserGroupsKey(userId)));
      }

      await Promise.all(promises);
      console.log(
        `Invalidated group members cache for groupId:${groupId} and ${memberUserIds.length} user caches`
      );
      return true;
    } catch (error) {
      console.log(`Error invalidating group members cache:${error.message}`);
      return false;
    }
  }

  async invalidateGroupInviteCache(inviteCode) {
    try {
      const key = this.generateGroupInviteKey(inviteCode);
      const result = await this.client.del(key);
      console.log(
        `Invalidated group invite cache for inviteCode:${inviteCode}`
      );
      return result > 0;
    } catch (error) {
      console.log(`Error invalidating group invite cache:${error.message}`);
      return false;
    }
  }

  async invalidateMembershipCache(userId, groupId) {
    try {
      const cacheKey = this.generateMembershipKey(userId, groupId);
      const result = await this.client.del(cacheKey);
      console.log(
        `Invalidated membership cache for user:${userId} group:${groupId}`
      );
      return result > 0;
    } catch (error) {
      console.log(`Failed to invalidate membership cache: ${error.message}`);
    }
  }
  async invalidateAllUserMemberships(userId) {
    try {
      const pattern = `membership:${userId}`;
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
        console.log(
          `Invalidated ${keys.length} membership cache entries for userId:${userId}`
        );
      }
      return keys.length;
    } catch (error) {
      console.log(`Error invalidating user memberships cache:${error.message}`);
      return 0;
    }
  }
  async invalidateCachesForNewMember(userId, groupId, existingMemberIds = []) {
    try {
      const promises = [];
      promises.push(this.invalidateUserGroupCache(userId));
      promises.push(this.invalidateGroupCache(groupId));

      for (const memberId of existingMemberIds) {
        promises.push(this.invalidateUserGroupCache(memberId));
        promises.push(this.invalidateMembershipCache(memberId, groupId));
      }
      await Promise.all(promises);
      console.log(
        `Invalidated all relevant caches for new member userId:${userId} in groupId:${groupId}`
      );
      return true;
    } catch (error) {
      console.log(`Error invalidating caches for new member:${error.message}`);
      return false;
    }
  }
}

export const cacheService = new CacheService();
