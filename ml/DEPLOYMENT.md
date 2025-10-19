# ML Service Deployment Guide

## Quick Start (Local Development)

### 1. Install Dependencies

```bash
cd ml
pip install -r requirements.txt
```

### 2. Train Model

```bash
python train_model.py
```

Expected output:
```
Model trained and saved to procrastination-model.pkl
Training accuracy: 95%
Model classes: [0 1 2]
```

### 3. Run Service Locally

```bash
python main.py
```

Service starts on `http://localhost:8000`

### 4. Test the Service

**Run golden unit tests:**
```bash
# Test model locally
python test_model.py

# Test API endpoint
python test_model.py --api
```

**Manual API test:**
```bash
curl -X POST http://localhost:8000/features \
  -H "Content-Type: application/json" \
  -d '{"features": [0.5, 5.0, 0.5, 10, 0.6, 12, 0.5, 0.65, 0.5, 0.5]}'
```

Expected response:
```json
{
  "score": 48,
  "level": "moderate",
  "confidence": 0.85,
  "features_used": ["tasks_overdue_ratio", ...]
}
```

### 5. View API Documentation

Open http://localhost:8000/docs for interactive Swagger UI

---

## Production Deployment (Fly.io)

### Prerequisites

1. **Install Fly CLI:**
   ```bash
   # macOS
   brew install flyctl
   
   # Linux
   curl -L https://fly.io/install.sh | sh
   
   # Windows
   powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
   ```

2. **Authenticate:**
   ```bash
   flyctl auth login
   ```

### Deploy Steps

1. **Create Fly app (first time only):**
   ```bash
   cd ml
   flyctl apps create taskspark-ml
   ```

2. **Deploy:**
   ```bash
   flyctl deploy
   ```

   This will:
   - Build Docker image
   - Train model during build
   - Deploy to Fly.io
   - Start service

3. **Verify deployment:**
   ```bash
   # Check status
   flyctl status
   
   # View logs
   flyctl logs
   
   # Get URL
   flyctl info
   ```

   Your service will be at: `https://taskspark-ml.fly.dev`

4. **Test production endpoint:**
   ```bash
   curl -X POST https://taskspark-ml.fly.dev/features \
     -H "Content-Type: application/json" \
     -d '{"features": [0.5, 5.0, 0.5, 10, 0.6, 12, 0.5, 0.65, 0.5, 0.5]}'
   ```

### Update Express Backend

After deploying to Fly.io, update your Express server environment:

```bash
# In Replit Secrets
ML_SERVICE_URL=https://taskspark-ml.fly.dev
```

Then restart your Express server.

---

## Scaling & Cost Management

### Auto-scale Settings (in fly.toml)

```toml
[http_service]
  auto_stop_machines = true  # Stop when idle
  auto_start_machines = true # Start on demand
  min_machines_running = 0   # Scale to zero
```

**Benefits:**
- ✅ Free tier friendly (scales to zero when not in use)
- ✅ Starts automatically on first request
- ✅ ~1-2 second cold start time

### Manual Scaling

```bash
# Scale down to 0 (free tier)
flyctl scale count 0

# Scale up to 1
flyctl scale count 1

# Scale horizontally (multiple regions)
flyctl scale count 2
```

### Resource Limits

Current configuration:
- **CPU**: 1 shared core
- **Memory**: 256MB
- **Region**: iad (US East)

To change:
```bash
# Increase memory
flyctl scale memory 512

# Change region
flyctl regions add lax  # US West
```

---

## Monitoring

### View Logs

```bash
# Real-time logs
flyctl logs

# Historical logs
flyctl logs --lines 100
```

### Health Checks

Fly.io automatically monitors `/health` endpoint every 30 seconds.

If service is unhealthy:
```bash
# Restart service
flyctl apps restart taskspark-ml

# Check status
flyctl status
```

### SSH into Container

```bash
flyctl ssh console
```

Inside container:
```bash
# Check model file
ls -lh procrastination-model.pkl

# Test locally
curl http://localhost:8000/health
```

---

## Troubleshooting

### Build Failures

**Issue**: Docker build fails

**Solution**:
```bash
# View build logs
flyctl logs --app taskspark-ml

# Common issues:
# 1. requirements.txt missing dependencies
# 2. Python version mismatch
# 3. Model training fails

# Fix and redeploy
flyctl deploy
```

### Service Not Responding

**Issue**: 503 errors or timeouts

**Solutions**:
1. Check if machines are running:
   ```bash
   flyctl status
   ```

2. Restart machines:
   ```bash
   flyctl apps restart taskspark-ml
   ```

3. Scale up manually:
   ```bash
   flyctl scale count 1
   ```

### Model Prediction Errors

**Issue**: Predictions return 500 errors

**Debugging**:
1. SSH into container:
   ```bash
   flyctl ssh console
   ```

2. Test model locally:
   ```bash
   python test_model.py
   ```

3. Check model file:
   ```bash
   ls -lh procrastination-model.pkl
   python -c "import pickle; print(pickle.load(open('procrastination-model.pkl', 'rb')).keys())"
   ```

### Invalid Feature Ranges

**Issue**: 400 errors "features must be in range..."

**Solution**: Ensure Express backend sends features in correct ranges:
- Features 0,2,4,6,7,8,9: 0-1
- Feature 1: 0-10
- Features 3,5: 0-30

---

## Cost Estimates

### Free Tier (Hobby)

Fly.io free tier includes:
- ✅ Up to 3 shared-cpu VMs
- ✅ 3GB storage
- ✅ 160GB outbound data/month

**This ML service fits within free tier** if:
- Auto-scaling enabled (scale to zero)
- Single region deployment
- Moderate usage (<1000 predictions/day)

### Paid Tier

If you exceed free tier:
- **VM**: ~$1.50/month (always-on 256MB)
- **Storage**: Included
- **Bandwidth**: $0.02/GB (after 160GB)

**Estimated cost**: $1.50 - $5/month for typical usage

---

## Alternative: Self-Hosted

If you don't want to use Fly.io, you can:

1. **Run locally** (development only):
   ```bash
   python main.py
   # Set ML_SERVICE_URL=http://localhost:8000
   ```

2. **Docker Compose** (self-hosted):
   ```yaml
   # docker-compose.yml
   services:
     ml-service:
       build: ./ml
       ports:
         - "8000:8000"
       restart: unless-stopped
   ```

3. **Other platforms**:
   - AWS Lambda (serverless)
   - Google Cloud Run
   - Railway.app
   - Render.com

---

## Security

### API Key (Optional)

Add API key authentication:

1. Update `main.py`:
   ```python
   from fastapi import Header, HTTPException
   
   API_KEY = os.getenv("ML_API_KEY", "your-secret-key")
   
   @app.post("/features")
   async def predict_procrastination(
       request: FeaturesRequest,
       x_api_key: str = Header(None)
   ):
       if x_api_key != API_KEY:
           raise HTTPException(status_code=401, detail="Invalid API key")
       # ... rest of code
   ```

2. Set secret in Fly.io:
   ```bash
   flyctl secrets set ML_API_KEY=your-secret-key
   ```

3. Update Express backend:
   ```javascript
   const response = await fetch(`${ML_SERVICE_URL}/features`, {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'X-API-Key': process.env.ML_API_KEY
     },
     body: JSON.stringify({ features })
   });
   ```

---

## CI/CD (GitHub Actions)

Automate deployments:

```yaml
# .github/workflows/deploy-ml.yml
name: Deploy ML Service

on:
  push:
    branches: [main]
    paths:
      - 'ml/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --app taskspark-ml
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

---

## Performance Optimization

### Caching Predictions

Express already caches for 1 hour. To cache longer:

```javascript
// server/routes.ts
cacheService.set(cacheKey, result, 24 * 60 * 60); // 24 hours
```

### Batch Predictions

Add batch endpoint to `main.py`:

```python
@app.post("/batch-features")
async def predict_batch(requests: List[FeaturesRequest]):
    results = []
    for req in requests:
        # ... predict each
        results.append(result)
    return {"predictions": results}
```

### Model Optimization

1. **Reduce model size**:
   ```python
   # Use sparse matrices
   from sklearn.linear_model import SGDClassifier
   model = SGDClassifier()  # More memory efficient
   ```

2. **Feature selection**:
   - Remove low-importance features
   - Reduce from 10 to 6-7 features

---

## Next Steps

1. ✅ Deploy to Fly.io
2. ✅ Test production endpoint
3. ✅ Update Express `ML_SERVICE_URL`
4. ✅ Monitor for 24 hours
5. 🔄 Iterate on model with real data
6. 🔄 Add more golden tests
7. 🔄 Implement batch prediction
8. 🔄 Add API key authentication

---

**Last Updated**: October 19, 2025  
**Service Version**: 1.0.0  
**Model Accuracy**: 95%
