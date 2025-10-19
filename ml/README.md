# Procrastination Score ML Service

FastAPI microservice that predicts procrastination scores using logistic regression.

## Features

**Input**: 10 behavioral features from task management data
**Output**: Procrastination score (0-100) with confidence level

### Feature Vector (10 floats)

1. `tasks_overdue_ratio` (0-1): Percentage of overdue tasks
2. `avg_task_completion_time` (0-10): Average days to complete tasks
3. `tasks_with_high_priority_incomplete` (0-1): Ratio of high priority incomplete tasks
4. `days_since_last_completion` (0-30): Days since last task completed
5. `task_creation_to_due_ratio` (0-1): Tasks created close to due date
6. `avg_task_age` (0-30): Average age of incomplete tasks (days)
7. `completion_rate_last_week` (0-1): Completion rate in last 7 days
8. `tasks_in_progress_ratio` (0-1): Ratio of tasks marked "in-progress"
9. `project_switching_frequency` (0-1): How often user switches projects
10. `ai_suggestions_ignored_ratio` (0-1): Ratio of AI suggestions not followed

### Score Levels

- **Low (0-30)**: Excellent task management, minimal procrastination
- **Moderate (31-60)**: Some procrastination tendencies, room for improvement
- **High (61-100)**: Significant procrastination, needs intervention

## Local Development

### 1. Train Model

```bash
cd ml
pip install -r requirements.txt
python train_model.py
```

This creates `procrastination-model.pkl`.

### 2. Run FastAPI Service

```bash
python main.py
```

Service runs on `http://localhost:8000`

### 3. Test the API

```bash
# Run golden unit tests (local)
python test_model.py

# Run golden unit tests (API)
python test_model.py --api

# Manual test via curl
curl -X POST http://localhost:8000/features \
  -H "Content-Type: application/json" \
  -d '{"features": [0.5, 5.0, 0.5, 10, 0.6, 12, 0.5, 0.65, 0.5, 0.5]}'
```

### 4. View API Docs

Open `http://localhost:8000/docs` for interactive Swagger documentation.

## Deployment to Fly.io

### Prerequisites

```bash
# Install flyctl
brew install flyctl  # macOS
# or
curl -L https://fly.io/install.sh | sh  # Linux

# Authenticate
flyctl auth login
```

### Deploy

```bash
cd ml

# Create app (first time only)
flyctl apps create taskspark-ml

# Deploy
flyctl deploy

# Check status
flyctl status

# View logs
flyctl logs

# Get URL
flyctl info
```

Your ML service will be available at: `https://taskspark-ml.fly.dev`

### Update Deployment

```bash
# After making changes
flyctl deploy

# Scale down to 0 when not in use (free tier)
flyctl scale count 0

# Scale up when needed
flyctl scale count 1
```

## API Endpoints

### `GET /`
Health check and service info

### `GET /health`
Service health status

### `POST /features`
Predict procrastination score

**Request:**
```json
{
  "features": [0.5, 5.0, 0.5, 10, 0.6, 12, 0.5, 0.65, 0.5, 0.5]
}
```

**Response:**
```json
{
  "score": 48,
  "level": "moderate",
  "confidence": 0.85,
  "features_used": ["tasks_overdue_ratio", "avg_task_completion_time", ...]
}
```

## Golden Test Cases

The `test_model.py` includes 5 golden test cases:

1. **Excellent Performer**: Low score (0-30)
2. **Moderate Procrastinator**: Medium score (31-60)
3. **High Procrastinator**: High score (61-100)
4. **Edge Case: All zeros**: Validates minimum input
5. **Edge Case: Maximum values**: Validates maximum input

All tests must pass before deployment.

## Integration with Express Backend

The Express backend calls this ML service:

```javascript
// Server-side
const response = await fetch('https://taskspark-ml.fly.dev/features', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ features: featureVector })
});
const result = await response.json();
// Cache result for 1 hour
```

## Model Details

- **Algorithm**: Logistic Regression (scikit-learn)
- **Classes**: 3 (low, moderate, high)
- **Training Data**: 20 synthetic samples
- **Accuracy**: ~95% on training data
- **Inference Time**: <50ms

## Monitoring

```bash
# View logs
flyctl logs

# Check metrics
flyctl metrics

# SSH into container
flyctl ssh console
```

## Troubleshooting

**Model not loading:**
```bash
# Retrain model
python train_model.py

# Verify .pkl file exists
ls -lh procrastination-model.pkl
```

**API not responding:**
```bash
# Check Fly.io status
flyctl status

# Restart
flyctl apps restart taskspark-ml
```

**Prediction errors:**
```bash
# Run unit tests
python test_model.py

# Check feature ranges
# All features must be within valid ranges
```

## Future Improvements

- [ ] Use real task data for training
- [ ] Implement cross-validation
- [ ] Add feature importance analysis
- [ ] A/B test different algorithms
- [ ] Add model versioning
- [ ] Implement batch prediction endpoint
- [ ] Add model monitoring and drift detection
