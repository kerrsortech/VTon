/**
 * Redis Client for Context and Session Storage
 * Uses Upstash Redis for serverless/edge compatibility
 */

import { Redis } from '@upstash/redis';

// Initialize Redis client
let redis: Redis | null = null;

function getRedisClient(): Redis {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      throw new Error(
        'Redis not configured. Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables.'
      );
    }

    redis = new Redis({
      url,
      token,
    });
  }

  return redis;
}

/**
 * Store context for a session
 * @param sessionId - Unique session identifier
 * @param context - Context object to store
 * @param ttl - Time to live in seconds (default: 1 hour)
 */
export async function setContext(
  sessionId: string,
  context: any,
  ttl: number = 3600
): Promise<void> {
  try {
    const client = getRedisClient();
    const key = `context:${sessionId}`;
    await client.setex(key, ttl, JSON.stringify(context));
  } catch (error) {
    console.error('[Redis] Error setting context:', error);
    throw error;
  }
}

/**
 * Get context for a session
 * @param sessionId - Unique session identifier
 * @returns Context object or null if not found
 */
export async function getContext(sessionId: string): Promise<any | null> {
  try {
    const client = getRedisClient();
    const key = `context:${sessionId}`;
    const data = await client.get(key);
    return data ? JSON.parse(data as string) : null;
  } catch (error) {
    console.error('[Redis] Error getting context:', error);
    return null;
  }
}

/**
 * Store conversation history for a session
 * @param sessionId - Unique session identifier
 * @param history - Conversation history array
 * @param ttl - Time to live in seconds (default: 1 hour)
 */
export async function setConversationHistory(
  sessionId: string,
  history: any[],
  ttl: number = 3600
): Promise<void> {
  try {
    const client = getRedisClient();
    const key = `conversation:${sessionId}`;
    await client.setex(key, ttl, JSON.stringify(history));
  } catch (error) {
    console.error('[Redis] Error setting conversation history:', error);
    throw error;
  }
}

/**
 * Get conversation history for a session
 * @param sessionId - Unique session identifier
 * @returns Conversation history array or empty array if not found
 */
export async function getConversationHistory(
  sessionId: string
): Promise<any[]> {
  try {
    const client = getRedisClient();
    const key = `conversation:${sessionId}`;
    const data = await client.get(key);
    return data ? JSON.parse(data as string) : [];
  } catch (error) {
    console.error('[Redis] Error getting conversation history:', error);
    return [];
  }
}

/**
 * Delete context for a session
 * @param sessionId - Unique session identifier
 */
export async function deleteContext(sessionId: string): Promise<void> {
  try {
    const client = getRedisClient();
    const key = `context:${sessionId}`;
    await client.del(key);
  } catch (error) {
    console.error('[Redis] Error deleting context:', error);
  }
}

/**
 * Delete conversation history for a session
 * @param sessionId - Unique session identifier
 */
export async function deleteConversationHistory(
  sessionId: string
): Promise<void> {
  try {
    const client = getRedisClient();
    const key = `conversation:${sessionId}`;
    await client.del(key);
  } catch (error) {
    console.error('[Redis] Error deleting conversation history:', error);
  }
}

