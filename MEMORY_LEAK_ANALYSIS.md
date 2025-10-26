# Memory Leak Analysis Report

**Date**: October 26, 2025  
**Application**: TaskSpark AI  
**Status**: 🟡 3 Issues Found (2 High Priority, 1 Medium Priority)

---

## Executive Summary

Analysis of TaskSpark AI identified **3 memory leak vulnerabilities** across frontend components and backend caching systems. Two are high-priority issues requiring immediate fixes, and one is medium-priority requiring monitoring.

---

## 🔴 High Priority Issues

### 1. Carousel Component - Missing Event Listener Cleanup

**File**: `client/src/components/ui/carousel.tsx`  
**Lines**: 107-119  
**Severity**: HIGH  
**Impact**: Memory leak on every carousel instance

#### Problem
The carousel component registers two event listeners (`reInit` and `select`) but only removes one in the cleanup function:

```typescript
React.useEffect(() => {
  if (!api) {
    return
  }

  onSelect(api)
  api.on("reInit", onSelect)  // ❌ Registered
  api.on("select", onSelect)  // ❌ Registered

  return () => {
    api?.off("select", onSelect)  // ✅ Only removes 'select'
    // ❌ Missing: api?.off("reInit", onSelect)
  }
}, [api, onSelect])
```

#### Impact
- Every time a carousel is mounted/unmounted, one `reInit` listener remains in memory
- If users navigate between pages with carousels, listeners accumulate
- Over time, this causes memory bloat and potential performance degradation

#### Recommended Fix
```typescript
return () => {
  api?.off("reInit", onSelect)  // Add this line
  api?.off("select", onSelect)
}
```

---

### 2. AI Chat Panel - Untracked setTimeout

**File**: `client/src/components/ai-chat-panel.tsx`  
**Lines**: 126-131  
**Severity**: HIGH  
**Impact**: DOM manipulation after unmount, potential crashes

#### Problem
Uses `setTimeout` without tracking the timeout ID or cleaning it up:

```typescript
const handlePromptClick = async (prompt: string) => {
  setInput(prompt);
  // Auto-send the suggested prompt
  setTimeout(() => {
    const sendButton = document.querySelector('[data-testid="button-send-message"]') as HTMLButtonElement;
    if (sendButton) {
      sendButton.click();  // ❌ Can execute after component unmounts
    }
  }, 100);  // ❌ No cleanup, no ref tracking
};
```

#### Impact
- If user closes AI chat panel within 100ms of clicking a suggested prompt, timeout still fires
- Attempts to query DOM and click button that may no longer exist
- Can cause console errors and unexpected behavior
- Multiple rapid clicks can queue multiple timeouts

#### Recommended Fix
```typescript
const handlePromptClick = async (prompt: string) => {
  setInput(prompt);
  // Directly trigger the send instead of using setTimeout
  handleSend();
};
```

**Alternative Fix** (if delay is required):
```typescript
const timeoutRef = useRef<NodeJS.Timeout | null>(null);

const handlePromptClick = async (prompt: string) => {
  setInput(prompt);
  
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
  }
  
  timeoutRef.current = setTimeout(() => {
    handleSend();
    timeoutRef.current = null;
  }, 100);
};

// Add cleanup in useEffect
useEffect(() => {
  return () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };
}, []);
```

---

## 🟡 Medium Priority Issues

### 3. Cache Service - Unbounded Growth Potential

**File**: `server/services/cache.service.ts`, `server/services/data-cache.service.ts`  
**Severity**: MEDIUM  
**Impact**: Memory growth over time in long-running servers

#### Problem
The cache uses MD5 hashing of filter combinations to create unique keys:

```typescript
generateTasksKey: (filters?: TaskFilters) => {
  const key = filters ? md5(JSON.stringify(filters)) : 'all';
  return `${CACHE_NAMESPACE.DATA_TASKS}:${key}`;
}
```

**Issues**:
1. **90-day TTL is very long** - Cache entries stay in memory for 3 months
2. **Unlimited unique filter combinations** - Each unique combination of `{search, priority, status, projectId, userId}` creates a new cache entry
3. **No max cache size limit** - `node-cache` can grow unbounded if filter combinations are diverse

#### Current Mitigation
✅ Short TTLs for data caches (5-30 minutes) help limit growth  
✅ `invalidateTasks()` clears task caches on mutations  
✅ `clearAll()` function available for manual cache clearing  

#### Potential Issues
- If users create many unique filter combinations, cache can grow large
- AI cache entries (decompose, reorganize, day-plan) have 90-day TTL
- No monitoring of cache size or memory usage

#### Recommended Improvements

**1. Add Cache Size Limits**
```typescript
const cache = new NodeCache({
  stdTTL: 90 * 24 * 60 * 60,
  checkperiod: 120,
  maxKeys: 10000,  // Add max key limit
});
```

**2. Implement Cache Size Monitoring**
```typescript
export const cacheService = {
  // ... existing methods ...
  
  getMemoryUsage: () => {
    const stats = cache.getStats();
    const keys = cache.keys();
    return {
      keyCount: keys.length,
      hits: stats.hits,
      misses: stats.misses,
      hitRate: stats.hits / (stats.hits + stats.misses) || 0,
      approximateMemoryMB: keys.length * 0.01 // Rough estimate
    };
  },
  
  pruneOldEntries: () => {
    // Manually trigger cleanup
    cache.flushStats();
  }
};
```

**3. Reduce AI Cache TTL**
```typescript
// Instead of 90 days, use shorter TTLs:
const AI_CACHE_TTL = {
  DECOMPOSE: 7 * 24 * 60 * 60,    // 7 days
  REORGANIZE: 24 * 60 * 60,        // 1 day
  DAY_PLAN: 24 * 60 * 60,          // 1 day
};
```

**4. Add Cache Endpoint for Monitoring**
```typescript
// In routes.ts
app.get('/api/admin/cache/stats', isAdmin, async (req, res) => {
  const stats = cacheService.getStats();
  const memory = cacheService.getMemoryUsage();
  res.json({ stats, memory });
});

app.post('/api/admin/cache/clear', isAdmin, async (req, res) => {
  cacheService.flush();
  res.json({ message: 'Cache cleared' });
});
```

---

## ✅ Good Practices Found

### Event Listener Cleanup (App.tsx)
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // ...
  };
  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);  // ✅ Proper cleanup
}, []);
```

### Interval Cleanup (FocusSprint.tsx)
```typescript
useEffect(() => {
  if (!isPaused) {
    intervalRef.current = setInterval(() => {
      // ...
    }, 1000);
  }
  return () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);  // ✅ Proper cleanup
    }
  };
}, [isPaused, phase]);
```

### Push Notification Cleanup (usePushNotifications.ts)
```typescript
useEffect(() => {
  // ... setup listeners ...
  return () => {
    PushNotifications.removeAllListeners();  // ✅ Proper cleanup
  };
}, [toast]);
```

---

## Additional Observations

### React Query Usage
- ✅ **No memory leaks detected** in React Query usage
- Queries and mutations properly configured
- Cache invalidation working correctly
- No unsubscribed queries found

### Session Storage
- ⚠️ PostgreSQL session table (`connect-pg-simple`) can grow unbounded
- No automatic session pruning configured
- **Recommendation**: Add session cleanup job

```typescript
// Add to server initialization
import schedule from 'node-schedule';

// Clean up expired sessions daily at 3 AM
schedule.scheduleJob('0 3 * * *', async () => {
  await db.execute(sql`DELETE FROM sessions WHERE expire < NOW()`);
  logger.info('Expired sessions cleaned up');
});
```

---

## Recommendations Priority Matrix

| Issue | Priority | Effort | Impact | When to Fix |
|-------|----------|--------|--------|-------------|
| Carousel listener leak | HIGH | Low (5 min) | High | Immediately |
| AI Chat setTimeout | HIGH | Low (10 min) | Medium | Immediately |
| Cache unbounded growth | MEDIUM | Medium (1-2 hrs) | Medium | Next sprint |
| Session table cleanup | LOW | Low (30 min) | Low | Future |

---

## Implementation Plan

### Phase 1: Quick Wins (Today)
1. ✅ Fix carousel `reInit` listener cleanup
2. ✅ Fix AI chat `setTimeout` issue

### Phase 2: Monitoring (This Week)
3. Add cache size monitoring endpoint
4. Add cache statistics to admin dashboard
5. Set up alerts for cache size > 5000 keys

### Phase 3: Long-term Improvements (Next Sprint)
6. Reduce AI cache TTLs from 90 days to 7 days
7. Add `maxKeys` limit to node-cache
8. Implement session table cleanup cron job
9. Add memory usage metrics to observability

---

## Testing Recommendations

### Memory Leak Testing
```bash
# 1. Load test with navigation
# Navigate between pages 100 times and check memory
for i in {1..100}; do
  # Visit carousel pages
  # Open/close AI chat
  # Check process memory
done

# 2. Cache stress test
# Create 1000 unique filter combinations
# Monitor cache size and memory usage

# 3. Session cleanup test
# Create 10000 sessions
# Verify cleanup job removes expired ones
```

### Browser DevTools Profiling
1. Open Chrome DevTools > Memory
2. Take heap snapshot
3. Navigate through app (especially carousels and AI chat)
4. Take another heap snapshot
5. Compare - look for detached DOM nodes and event listeners

---

## Conclusion

TaskSpark AI has **good memory management practices** in most areas, but 3 issues require attention:

- **2 High-Priority Fixes** needed immediately (carousel + setTimeout)
- **1 Medium-Priority Enhancement** for cache management
- Overall code quality is good with proper cleanup in most components

**Estimated Time to Fix All Issues**: 2-3 hours

**Risk Level After Fixes**: LOW ✅

---

## Additional Resources

- [MDN: Memory Management](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_Management)
- [React: Cleanup Functions](https://react.dev/learn/synchronizing-with-effects#how-to-handle-the-effect-firing-twice-in-development)
- [Node Cache Documentation](https://www.npmjs.com/package/node-cache)
- [Chrome DevTools Memory Profiling](https://developer.chrome.com/docs/devtools/memory-problems/)
