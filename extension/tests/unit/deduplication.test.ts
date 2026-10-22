import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateUUID,
  hashCandidateIdentifier,
  SessionDeduplicator,
} from '../../src/tracking/deduplication';

describe('Deduplication & Identity Utilities', () => {
  it('generates valid UUIDv4 strings', () => {
    const id1 = generateUUID();
    const id2 = generateUUID();

    expect(id1).not.toBe(id2);
    // UUID regex format check
    expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('generates deterministic privacy-preserving hashes without exposing raw content', () => {
    const rawUrl = 'https://www.instagram.com/reel/C3B5-xyz123/';
    const hash1 = hashCandidateIdentifier(rawUrl);
    const hash2 = hashCandidateIdentifier(rawUrl);
    const hashDiff = hashCandidateIdentifier('https://www.instagram.com/reel/C999-other/');

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hashDiff);
    expect(hash1.startsWith('cand_')).toBe(true);
    // Raw identifiers must NOT be contained in hash
    expect(hash1).not.toContain('instagram');
    expect(hash1).not.toContain('C3B5-xyz123');
  });

  describe('SessionDeduplicator', () => {
    let deduplicator: SessionDeduplicator;

    beforeEach(() => {
      deduplicator = new SessionDeduplicator();
    });

    it('identifies seen candidates within the same session', () => {
      const sessionId = 'session-1';
      const candidateA = 'cand_aaa111';
      const candidateB = 'cand_bbb222';

      expect(deduplicator.hasCandidateBeenSeen(sessionId, candidateA)).toBe(false);

      deduplicator.markCandidateSeen(sessionId, candidateA);
      expect(deduplicator.hasCandidateBeenSeen(sessionId, candidateA)).toBe(true);
      expect(deduplicator.hasCandidateBeenSeen(sessionId, candidateB)).toBe(false);
      expect(deduplicator.getSeenCount(sessionId)).toBe(1);
    });

    it('isolates candidate records between different sessions', () => {
      const session1 = 'session-1';
      const session2 = 'session-2';
      const candidate = 'cand_shared123';

      deduplicator.markCandidateSeen(session1, candidate);

      expect(deduplicator.hasCandidateBeenSeen(session1, candidate)).toBe(true);
      expect(deduplicator.hasCandidateBeenSeen(session2, candidate)).toBe(false);
    });

    it('cleans up cleared sessions', () => {
      const sessionId = 'session-to-clear';
      deduplicator.markCandidateSeen(sessionId, 'cand_1');
      expect(deduplicator.hasCandidateBeenSeen(sessionId, 'cand_1')).toBe(true);

      deduplicator.clearSession(sessionId);
      expect(deduplicator.hasCandidateBeenSeen(sessionId, 'cand_1')).toBe(false);
      expect(deduplicator.getSeenCount(sessionId)).toBe(0);
    });
  });
});
