import { db } from '../server/db';

interface CacheEntry {
  fingerprint: string;
  data: Record<string, any>;
  timestamp: number;
}

// In-memory LRU for hot entries (fast access)
class LRUCache {
  private cache: Map<string, CacheEntry>;
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(fp: string): CacheEntry | null {
    const entry = this.cache.get(fp);
    if (!entry) return null;
    
    // Move to end (most recently used)
    this.cache.delete(fp);
    this.cache.set(fp, entry);
    return entry;
  }

  set(fp: string, data: Record<string, any>): void {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(fp, {
      fingerprint: fp,
      data,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

const memoryCache = new LRUCache(100);
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

class SQLiteCache {
  get(fp: string): CacheEntry | null {
    // Check memory cache first
    const memEntry = memoryCache.get(fp);
    if (memEntry) return memEntry;
    
    // Check SQLite
    const row = db.query(`
      SELECT fp, created_at 
      FROM fingerprints 
      WHERE fp = ? AND created_at > ?
    `).get(fp, Date.now() - CACHE_TTL_MS) as { fp: string; created_at: number } | undefined;
    
    if (!row) return null;
    
    // Load insights from SQLite
    const insights = db.query(`
      SELECT persona, kind, content 
      FROM insights 
      WHERE fp = ?
    `).all(fp) as Array<{ persona: string; kind: string; content: string }>;
    
    if (insights.length === 0) return null;
    
    // Reconstruct data structure
    const data: Record<string, any> = {};
    for (const insight of insights) {
      if (!data[insight.persona]) {
        data[insight.persona] = [];
      }
      data[insight.persona].push({
        type: insight.kind,
        content: insight.content,
      });
    }
    
    // Handle single persona mode (backward compatibility)
    if (insights.length > 0 && insights[0].persona === '_single') {
      return {
        fingerprint: fp,
        data: { insights: data['_single'] || [] },
        timestamp: row.created_at,
      };
    }
    
    const entry: CacheEntry = {
      fingerprint: fp,
      data,
      timestamp: row.created_at,
    };
    
    // Populate memory cache
    memoryCache.set(fp, entry);
    
    return entry;
  }

  set(fp: string, data: Record<string, any>): void {
    const now = Date.now();
    
    // Update memory cache
    memoryCache.set(fp, {
      fingerprint: fp,
      data,
      timestamp: now,
    });
    
    // Persist to SQLite
    try {
      // Upsert fingerprint
      db.run(`
        INSERT INTO fingerprints (fp, text_hash, personas, created_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(fp) DO UPDATE SET created_at = ?
      `, fp, Bun.hash(JSON.stringify(data)).toString(), JSON.stringify(Object.keys(data)), now, now);
      
      // Delete old insights for this fingerprint
      db.run(`DELETE FROM insights WHERE fp = ?`, fp);
      
      // Insert new insights
      for (const [persona, items] of Object.entries(data)) {
        const itemsArray = Array.isArray(items) ? items : [items];
        for (const item of itemsArray) {
          const insightId = `insight-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          db.run(`
            INSERT INTO insights (id, fp, persona, kind, content, ts)
            VALUES (?, ?, ?, ?, ?, ?)
          `, insightId, fp, persona, item.type || 'lateral-prompt', item.content || JSON.stringify(item), now);
        }
      }
    } catch (error) {
      console.error('Error persisting cache to SQLite:', error);
    }
  }

  clear(): void {
    memoryCache.clear();
    db.run(`DELETE FROM fingerprints`);
    db.run(`DELETE FROM insights`);
  }
}

export const insightCache = new SQLiteCache();

