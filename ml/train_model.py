"""
Train a simple logistic regression model for procrastination score prediction.

Features (10 total):
1. tasks_overdue_ratio (0-1): Percentage of overdue tasks
2. avg_task_completion_time (0-10): Average days to complete tasks
3. tasks_with_high_priority_incomplete (0-1): Ratio of high priority incomplete tasks
4. days_since_last_completion (0-30): Days since last task was completed
5. task_creation_to_due_ratio (0-1): Tasks created close to due date
6. avg_task_age (0-30): Average age of incomplete tasks in days
7. completion_rate_last_week (0-1): Completion rate in last 7 days
8. tasks_in_progress_ratio (0-1): Ratio of tasks marked "in-progress"
9. project_switching_frequency (0-1): How often user switches between projects
10. ai_suggestions_ignored_ratio (0-1): Ratio of AI suggestions not followed

Score: 0-100 (0 = no procrastination, 100 = severe procrastination)
"""

import pickle
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler

# Training data: 20 sample feature vectors with known procrastination scores
# Each row: [feature1, feature2, ..., feature10, score]
training_data = np.array([
    # Low procrastination examples (score 0-30)
    [0.1, 1.0, 0.1, 2, 0.2, 3, 0.9, 0.3, 0.1, 0.1, 0],  # Excellent performer
    [0.15, 1.5, 0.15, 3, 0.25, 4, 0.85, 0.35, 0.15, 0.15, 0],  # Very good
    [0.2, 2.0, 0.2, 4, 0.3, 5, 0.8, 0.4, 0.2, 0.2, 0],  # Good
    [0.25, 2.5, 0.25, 5, 0.35, 6, 0.75, 0.45, 0.25, 0.25, 0],  # Decent
    
    # Moderate procrastination (score 30-60)
    [0.35, 3.5, 0.35, 7, 0.45, 8, 0.65, 0.5, 0.35, 0.35, 1],  # Mild issues
    [0.4, 4.0, 0.4, 8, 0.5, 9, 0.6, 0.55, 0.4, 0.4, 1],  # Moderate
    [0.45, 4.5, 0.45, 9, 0.55, 10, 0.55, 0.6, 0.45, 0.45, 1],  # Noticeable
    [0.5, 5.0, 0.5, 10, 0.6, 12, 0.5, 0.65, 0.5, 0.5, 1],  # Concerning
    [0.55, 5.5, 0.55, 12, 0.65, 14, 0.45, 0.7, 0.55, 0.55, 1],  # Problem
    
    # High procrastination (score 60-100)
    [0.65, 6.5, 0.65, 14, 0.7, 16, 0.35, 0.75, 0.65, 0.65, 2],  # High
    [0.7, 7.0, 0.7, 16, 0.75, 18, 0.3, 0.8, 0.7, 0.7, 2],  # Very high
    [0.75, 7.5, 0.75, 18, 0.8, 20, 0.25, 0.85, 0.75, 0.75, 2],  # Severe
    [0.8, 8.0, 0.8, 20, 0.85, 22, 0.2, 0.9, 0.8, 0.8, 2],  # Critical
    [0.9, 9.0, 0.9, 25, 0.9, 25, 0.1, 0.95, 0.9, 0.9, 2],  # Extreme
    
    # Additional varied examples
    [0.3, 3.0, 0.3, 6, 0.4, 7, 0.7, 0.5, 0.3, 0.3, 0],  # Low-moderate
    [0.6, 6.0, 0.6, 13, 0.68, 15, 0.4, 0.72, 0.6, 0.6, 2],  # Moderate-high
    [0.12, 1.2, 0.12, 2, 0.22, 3.5, 0.88, 0.32, 0.12, 0.12, 0],  # Excellent
    [0.5, 5.2, 0.48, 11, 0.58, 13, 0.52, 0.62, 0.52, 0.48, 1],  # Middle ground
    [0.85, 8.5, 0.85, 22, 0.88, 24, 0.15, 0.92, 0.85, 0.85, 2],  # Very severe
    [0.28, 2.8, 0.28, 5, 0.38, 6.5, 0.72, 0.48, 0.28, 0.28, 0],  # Good
])

# Separate features and labels
X = training_data[:, :-1]  # All columns except last
y = training_data[:, -1]   # Last column (class: 0=low, 1=moderate, 2=high)

# Scale features
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Train logistic regression model
model = LogisticRegression(random_state=42, max_iter=1000)
model.fit(X_scaled, y)

# Save model and scaler
with open('procrastination-model.pkl', 'wb') as f:
    pickle.dump({
        'model': model,
        'scaler': scaler,
        'feature_names': [
            'tasks_overdue_ratio',
            'avg_task_completion_time',
            'tasks_with_high_priority_incomplete',
            'days_since_last_completion',
            'task_creation_to_due_ratio',
            'avg_task_age',
            'completion_rate_last_week',
            'tasks_in_progress_ratio',
            'project_switching_frequency',
            'ai_suggestions_ignored_ratio'
        ]
    }, f)

print("Model trained and saved to procrastination-model.pkl")
print(f"Training accuracy: {model.score(X_scaled, y):.2%}")
print(f"Model classes: {model.classes_}")
