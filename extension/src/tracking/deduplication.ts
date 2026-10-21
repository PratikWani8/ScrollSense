/**
 * Deduplication & Identity Utilities
 * Provides privacy-preserving candidate hashing, UUID generation,
 * and session-scoped candidate view deduplication.
 */

/**
 * Generate a random UUIDv4 string.
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback RFC4122 version 4 compliant solution
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Fast, deterministic privacy-preserving hash for DOM candidates.
 * Uses 64-bit FNV-1a variant with session/random salt to ensure
 * no raw video URLs, IDs or titles are transmitted or permanently stored.
 */
export function hashCandidateIdentifier(rawIdentifier: string, salt: string = 'scrollsense-salt'): string {
  const combined = `${salt}:${rawIdentifier.trim()}`;
  let h1 = 0xdeadbeef ^ 0;
  let h2 = 0x41c6ce57 ^ 0;

  for (let i = 0; i < combined.length; i++) {
    const ch = combined.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  const hashPart1 = (4294967296 + (h1 >>> 0)).toString(16).substring(1);
  const hashPart2 = (4294967296 + (h2 >>> 0)).toString(16).substring(1);
  return `cand_${hashPart1}${hashPart2}`;
}

/**
 * Session-scoped deduplication manager to ensure candidate videos are not
 * counted multiple times within the same tracking session.
 */
export class SessionDeduplicator {
  private sessionSeenCandidates: Map<string, Set<string>> = new Map();
  private maxSessions = 50;
  private maxCandidatesPerSession = 2000;

  /**
   * Check if a candidate has already been qualified/seen in this session.
   */
  public hasCandidateBeenSeen(sessionId: string, candidateId: string): boolean {
    const sessionSet = this.sessionSeenCandidates.get(sessionId);
    if (!sessionSet) return false;
    return sessionSet.has(candidateId);
  }

  /**
   * Mark a candidate as qualified/seen in this session.
   */
  public markCandidateSeen(sessionId: string, candidateId: string): void {
    let sessionSet = this.sessionSeenCandidates.get(sessionId);
    if (!sessionSet) {
      // Evict oldest session if limit exceeded
      if (this.sessionSeenCandidates.size >= this.maxSessions) {
        const oldestKey = this.sessionSeenCandidates.keys().next().value;
        if (oldestKey) {
          this.sessionSeenCandidates.delete(oldestKey);
        }
      }
      sessionSet = new Set<string>();
      this.sessionSeenCandidates.set(sessionId, sessionSet);
    }

    if (sessionSet.size < this.maxCandidatesPerSession) {
      sessionSet.add(candidateId);
    }
  }

  /**
   * Count seen candidates for a given session.
   */
  public getSeenCount(sessionId: string): number {
    const sessionSet = this.sessionSeenCandidates.get(sessionId);
    return sessionSet ? sessionSet.size : 0;
  }

  /**
   * Clean up a completed session.
   */
  public clearSession(sessionId: string): void {
    this.sessionSeenCandidates.delete(sessionId);
  }

  /**
   * Clear all deduplication caches.
   */
  public clearAll(): void {
    this.sessionSeenCandidates.clear();
  }
}
