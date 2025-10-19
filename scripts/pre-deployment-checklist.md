# Pre-Deployment Checklist - TaskSpark AI

Use this checklist before every production deployment to ensure quality and stability.

## 1. Code Quality ✅

- [ ] No TypeScript errors (`npm run check`)
- [ ] All LSP diagnostics resolved
- [ ] No console.log statements in production code (use logger.service.ts)
- [ ] All `any` types replaced with proper TypeScript types
- [ ] Code follows existing patterns and conventions

## 2. Testing ✅

### Regression Tests
- [ ] Run comprehensive regression test suite
- [ ] All 10 test scenarios passed (73 test steps)
- [ ] No critical bugs reported
- [ ] Minor issues documented and triaged

### Manual Testing
- [ ] Test critical user flows in browser
- [ ] Verify on desktop and mobile viewports
- [ ] Test with real AI features (not just mocked)
- [ ] Verify Archive page shows archived tasks
- [ ] Test bulk import with various checklist formats

## 3. Database ✅

- [ ] Schema migrations applied (`npm run db:push`)
- [ ] No destructive migrations (ID type changes)
- [ ] Database connection stable
- [ ] Indexes present on frequently queried columns
- [ ] Sample data for testing exists

## 4. Environment Configuration ✅

- [ ] `DATABASE_URL` configured
- [ ] `SESSION_SECRET` set to secure random value
- [ ] `OPENAI_API_KEY` configured (via Replit AI Integrations)
- [ ] All required secrets present (check via Replit Secrets)
- [ ] No hardcoded secrets in code

## 5. Performance ✅

- [ ] Cache hit rate >70% (check via GET /api/cache/stats)
- [ ] API response times <200ms average
- [ ] Page load times <1s
- [ ] No memory leaks in long-running processes
- [ ] Database queries optimized (no N+1 queries)

### Performance Verification
```bash
# Get cache statistics
curl http://localhost:5000/api/cache/stats

# Expected response:
{
  "keys": 45,
  "hits": 850,
  "misses": 150,
  "hitRate": 0.85,
  "ksize": 45,
  "vsize": "~2MB"
}
```

## 6. Security ✅

- [ ] No secrets exposed in logs
- [ ] Authentication working correctly
- [ ] Session management secure
- [ ] API endpoints validate input (Zod schemas)
- [ ] No SQL injection vulnerabilities
- [ ] CORS configured correctly

## 7. Monitoring & Logging ✅

- [ ] Structured logging in place (logger.service.ts)
- [ ] Critical errors logged with context
- [ ] No sensitive data in logs (PII, API keys)
- [ ] Server logs accessible and parseable
- [ ] Error tracking configured

### Log Verification
Check server logs for proper format:
```
[2025-10-19T22:13:45.123Z] [ERROR] API Error: POST /api/tasks {"error":"ValidationError","field":"title"}
[2025-10-19T22:13:46.456Z] [INFO] Cache hit {"key":"data:tasks:all","hit":true}
```

## 8. API Health ✅

### Core Endpoints
- [ ] GET /api/tasks returns 200
- [ ] POST /api/tasks creates task (201)
- [ ] PATCH /api/tasks/:id updates task (200)
- [ ] DELETE /api/tasks/:id deletes task (204)
- [ ] GET /api/projects returns 200
- [ ] GET /api/usage returns 200
- [ ] GET /api/cache/stats returns 200

### AI Endpoints
- [ ] POST /api/ai/decompose returns subtasks
- [ ] POST /api/ai/day-plan generates schedule
- [ ] POST /api/ai/chat responds to messages
- [ ] POST /api/ai/reorganize returns suggestions
- [ ] Usage limits enforced (429 when exceeded)

### Error Handling
- [ ] 400 for invalid requests
- [ ] 404 for not found
- [ ] 429 for rate limits
- [ ] 500 for server errors (with logging)

## 9. Frontend ✅

### Pages Load Successfully
- [ ] Dashboard (/)
- [ ] Today (/today)
- [ ] Upcoming (/upcoming)
- [ ] Projects (/projects)
- [ ] AI Insights (/insights)
- [ ] Day Planner (/day-plan)
- [ ] Templates (/templates)
- [ ] Archive (/archive)
- [ ] Settings (/settings)

### UI/UX
- [ ] No console errors in browser
- [ ] Loading states show while fetching data
- [ ] Error states display user-friendly messages
- [ ] Toasts appear for success/error feedback
- [ ] Forms validate input
- [ ] Buttons have appropriate states (loading, disabled)

### Data Freshness
- [ ] Tasks update after mutations
- [ ] Archive page shows archived tasks immediately
- [ ] Cache invalidation works (no stale data)
- [ ] React Query refetchOnMount working

## 10. AI Features ✅

- [ ] Task decomposition generates subtasks with hours
- [ ] Day planner creates time blocks
- [ ] AI chat provides helpful responses
- [ ] Eisenhower reorganization works
- [ ] AI responses cached for 90 days
- [ ] Usage tracking counts AI calls correctly

## 11. Mobile (Capacitor) ✅

- [ ] Android build compiles successfully
- [ ] App runs on Android device/emulator
- [ ] Touch interactions work
- [ ] Keyboard behavior correct
- [ ] Status bar styling appropriate

## 12. Documentation ✅

- [ ] README.md up to date
- [ ] ARCHITECTURE_IMPROVEMENTS.md current
- [ ] REGRESSION_TESTING.md reflects test suite
- [ ] API changes documented
- [ ] Breaking changes noted

## 13. Deployment Verification ✅

After deploying to production:

### Smoke Tests (within 5 minutes)
- [ ] Homepage loads
- [ ] Can create a task
- [ ] Can complete a task
- [ ] Can archive a task
- [ ] AI decompose works (if quota available)
- [ ] No 500 errors in logs

### Health Checks (within 30 minutes)
- [ ] Database connection stable
- [ ] Cache working (hit rate >70%)
- [ ] Session management working
- [ ] No critical errors in logs
- [ ] Performance within acceptable range

### Rollback Plan
- [ ] Previous version backup available
- [ ] Database rollback script ready (if schema changed)
- [ ] Rollback procedure documented
- [ ] Team notified of deployment

## 14. Communication ✅

- [ ] Team notified of deployment schedule
- [ ] Changelog prepared for users
- [ ] Known issues documented
- [ ] Support team briefed on new features

---

## Quick Pre-Deployment Commands

```bash
# 1. Check TypeScript
npm run check

# 2. Run regression tests
# Tell Replit Agent: "Run regression tests"

# 3. Verify server is running
curl http://localhost:5000/api/tasks

# 4. Check cache performance
curl http://localhost:5000/api/cache/stats

# 5. Verify usage tracking
curl http://localhost:5000/api/usage

# 6. Test AI decompose (if quota available)
curl -X POST http://localhost:5000/api/ai/decompose \
  -H "Content-Type: application/json" \
  -d '{"title":"Build a feature"}'
```

---

## Deployment Go/No-Go Decision

**GO** if:
- ✅ All regression tests pass
- ✅ No critical bugs
- ✅ Performance metrics met
- ✅ Security verified
- ✅ Team ready

**NO-GO** if:
- ❌ Any regression test fails
- ❌ Critical bug found
- ❌ Performance degraded
- ❌ Security issue present
- ❌ Team unavailable for monitoring

---

**Deployment Approved By**: ___________________
**Date**: ___________________
**Version**: ___________________

---

*Last Updated: October 19, 2025*
