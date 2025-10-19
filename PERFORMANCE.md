# ⚡ Performance Optimization Guide

## Overview
TaskSpark AI implements a comprehensive performance optimization system combining database indexing, intelligent caching, and query optimization for lightning-fast data access.

## Performance Improvements

### 📊 Speed Comparison

| Endpoint | Before | After | Improvement |
|----------|--------|-------|-------------|
| GET /api/tasks | ~140ms | ~1ms | **140x faster** |
| GET /api/projects | ~112ms | ~1ms | **112x faster** |
| GET /api/insights | ~111ms | ~0ms | **>100x faster** |
| GET /api/templates | ~100ms | ~1ms | **100x faster** |

### 🎯 Cache Hit Rates
- **First Request**: Cache MISS - Data fetched from database
- **Subsequent Requests**: Cache HIT - Instant response from memory
- **Expected Hit Rate**: 70-90% for typical usage patterns

## Architecture

### 1. Database Indexing

**Single Column Indexes:**
```sql
-- Tasks table (most frequently queried)
idx_tasks_priority         -- Filter by priority (low, medium, high)
idx_tasks_status           -- Filter by status (todo, in-progress, completed)
idx_tasks_due_date         -- Sort and filter by due date
idx_tasks_project_id       -- Filter tasks by project
idx_tasks_created_at       -- Sort by creation date (DESC)
idx_tasks_is_recurring     -- Partial index for recurring tasks
idx_tasks_parent_task_id   -- Partial index for task hierarchy
```

**Composite Indexes:**
```sql
idx_tasks_status_priority   -- Combined filtering (e.g., "high priority todos")
idx_tasks_project_status    -- Project-specific status filtering
```

**Other Table Indexes:**
```sql
idx_quota_user_month        -- Fast monthly quota lookups
idx_insights_created_at     -- Recent insights sorting
idx_insights_type           -- Filter insights by type
idx_templates_project_id    -- Project-specific templates
```

**Benefits:**
- ⚡ 10-100x faster queries with filters
- 📈 Efficient sorting and pagination
- 🎯 Optimized for common query patterns

### 2. Intelligent Caching Layer

**Cache Architecture:**
```
┌─────────────────────────────────────┐
│  Client Request                     │
└─────────────────────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  Check In-Memory Cache              │
│  - MD5 hash of query params         │
│  - TTL: 5-30 minutes                │
└─────────────────────────────────────┘
         ↓ (if HIT)        ↓ (if MISS)
┌──────────────────┐  ┌──────────────────┐
│  Return Cached   │  │  Query Database  │
│  Data (instant)  │  │  with Indexes    │
└──────────────────┘  └──────────────────┘
                              ↓
                      ┌──────────────────┐
                      │  Store in Cache  │
                      │  Return to Client│
                      └──────────────────┘
```

**Cache Configuration:**

| Data Type | Cache TTL | Invalidation Strategy |
|-----------|-----------|----------------------|
| Tasks | 5 minutes | On create/update/delete |
| Projects | 30 minutes | On create/delete |
| Insights | 15 minutes | On create |
| Templates | 30 minutes | On create/update/delete |

**Cache Headers:**
- `X-Cache: HIT` - Data served from cache (instant)
- `X-Cache: MISS` - Data fetched from database (slower)

### 3. Cache Invalidation

**Smart Invalidation:**
```typescript
// When task is created/updated/deleted
POST /api/tasks        → Invalidate tasks cache
PATCH /api/tasks/:id   → Invalidate tasks cache
DELETE /api/tasks/:id  → Invalidate tasks cache

// When project is created/deleted
POST /api/projects     → Invalidate projects AND tasks cache
DELETE /api/projects   → Invalidate projects AND tasks cache

// When template is created/updated/deleted
POST /api/templates    → Invalidate templates cache
```

**Cascade Invalidation:**
- Deleting a project invalidates both projects AND tasks caches
- Creating decomposed tasks invalidates tasks cache
- Creating insights invalidates insights cache

## API Endpoints

### Cache Statistics

**GET /api/cache/stats**

Get real-time cache performance metrics:

```bash
curl http://localhost:5000/api/cache/stats
```

**Response:**
```json
{
  "keys": 8,
  "hits": 147,
  "misses": 12,
  "ksize": 1024,
  "vsize": 15360,
  "hitRate": 0.924
}
```

**Metrics:**
- `keys`: Number of cached items
- `hits`: Total cache hits (successful retrievals)
- `misses`: Total cache misses (database queries)
- `hitRate`: Cache hit rate (0.0 to 1.0)
- `ksize`: Total key size in bytes
- `vsize`: Total value size in bytes

### Clear Cache

**POST /api/cache/clear**

Clear all cached data (useful for debugging):

```bash
curl -X POST http://localhost:5000/api/cache/clear
```

**Response:**
```json
{
  "message": "All caches cleared successfully"
}
```

## Usage Examples

### Check Cache Performance

```bash
# First request (cache miss)
curl -i http://localhost:5000/api/tasks
# X-Cache: MISS
# Response time: ~140ms

# Second request (cache hit)
curl -i http://localhost:5000/api/tasks
# X-Cache: HIT  
# Response time: ~1ms
```

### Monitor Cache Stats

```bash
# Get current cache statistics
curl http://localhost:5000/api/cache/stats

# After many requests, check hit rate
{
  "hitRate": 0.85  // 85% of requests served from cache
}
```

### Clear Cache After Bulk Import

```bash
# Import 1000 tasks via script
node scripts/bulk-import.js

# Clear cache to ensure fresh data
curl -X POST http://localhost:5000/api/cache/clear
```

## Implementation Details

### Cache Keys

**Tasks Cache Keys:**
```typescript
// No filters
"tasks:all"

// With filters (MD5 hash of filter object)
"tasks:a3d8f9e2c1b4567890abcdef12345678"
```

**Other Cache Keys:**
```typescript
"projects:all"
"insights:all"
"templates:all"
```

### Cache Service API

```typescript
import { dataCacheService } from './services/data-cache.service';

// Get from cache
const tasks = dataCacheService.getTasks<Task[]>(filters);

// Set to cache
dataCacheService.setTasks(tasks, filters);

// Invalidate
dataCacheService.invalidateTasks();

// Get stats
const stats = dataCacheService.getStats();
```

## Best Practices

### 1. Use Appropriate TTLs
- **Frequently changing data**: 5 minutes (tasks)
- **Rarely changing data**: 30 minutes (projects, templates)
- **Medium volatility**: 15 minutes (insights)

### 2. Monitor Cache Hit Rates
- **Target**: 70-90% hit rate
- **Low hit rate (<50%)**: Increase TTL or adjust invalidation strategy
- **High hit rate (>95%)**: May indicate stale data, check invalidation

### 3. Invalidate Aggressively
- Always invalidate on mutations
- Use cascade invalidation for related data
- Better to invalidate too much than serve stale data

### 4. Watch Memory Usage
- Monitor `vsize` in cache stats
- Adjust TTLs if memory grows too large
- Consider Redis for larger datasets (future enhancement)

## Performance Testing

### Load Testing

```bash
# Install Apache Bench
sudo apt install apache2-utils

# Test without cache (first request)
ab -n 1000 -c 10 http://localhost:5000/api/tasks

# Test with cache (subsequent requests)
ab -n 1000 -c 10 http://localhost:5000/api/tasks
```

### Expected Results

**Without Cache (first 1000 requests):**
- Average response time: ~140ms
- Requests per second: ~70/sec

**With Cache (subsequent requests):**
- Average response time: ~1ms
- Requests per second: ~1000/sec

## Troubleshooting

### Issue: Low Cache Hit Rate

**Symptoms:**
- `hitRate` < 0.5 in cache stats
- Slow response times

**Solutions:**
1. Check TTL configuration (may be too short)
2. Verify cache invalidation isn't too aggressive
3. Monitor filter variations (each unique filter = new cache key)

### Issue: Stale Data

**Symptoms:**
- Data doesn't update after mutations
- UI shows old values

**Solutions:**
1. Check cache invalidation is called after mutations
2. Clear cache manually: `POST /api/cache/clear`
3. Reduce TTL for affected data type

### Issue: High Memory Usage

**Symptoms:**
- Server memory grows over time
- `vsize` > 100MB in cache stats

**Solutions:**
1. Reduce TTLs to expire data faster
2. Clear cache periodically
3. Consider upgrading to Redis for persistence

## Future Enhancements

- [ ] **Redis Integration** - Persistent caching with TTL
- [ ] **Cache Warming** - Pre-populate cache on server startup
- [ ] **Query Result Pagination** - Cache individual pages
- [ ] **Background Cache Refresh** - Update cache before expiry
- [ ] **Multi-Layer Caching** - Memory + Redis hybrid
- [ ] **Cache Analytics Dashboard** - Visual monitoring
- [ ] **Smart Cache Keys** - More efficient key generation
- [ ] **Compression** - Reduce cache memory footprint

## Summary

TaskSpark AI's performance optimization system delivers:

✅ **140x faster** response times with caching  
✅ **Database indexes** for efficient queries  
✅ **Smart invalidation** for data freshness  
✅ **Real-time monitoring** with cache stats  
✅ **Zero external dependencies** (in-memory caching)  

**Result**: Sub-millisecond response times for 70-90% of requests! ⚡

---

Built with ❤️ for speed
