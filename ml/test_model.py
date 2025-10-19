"""
Golden unit test for procrastination score prediction.

Tests with known feature vectors to ensure model consistency.
"""

import requests
import numpy as np

# Test vectors with expected outcomes
TEST_CASES = [
    {
        "name": "Excellent Performer (Low Procrastination)",
        "features": [0.1, 1.0, 0.1, 2, 0.2, 3, 0.9, 0.3, 0.1, 0.1],
        "expected_level": "low",
        "expected_score_range": (0, 30)
    },
    {
        "name": "Moderate Procrastinator",
        "features": [0.5, 5.0, 0.5, 10, 0.6, 12, 0.5, 0.65, 0.5, 0.5],
        "expected_level": "moderate",
        "expected_score_range": (31, 60)
    },
    {
        "name": "High Procrastinator (Critical)",
        "features": [0.8, 8.0, 0.8, 20, 0.85, 22, 0.2, 0.9, 0.8, 0.8],
        "expected_level": "high",
        "expected_score_range": (61, 100)
    },
    {
        "name": "Edge Case: All zeros",
        "features": [0.0, 0.0, 0.0, 0, 0.0, 0, 1.0, 0.0, 0.0, 0.0],
        "expected_level": "low",
        "expected_score_range": (0, 30)
    },
    {
        "name": "Edge Case: Maximum procrastination",
        "features": [0.95, 10.0, 0.95, 30, 0.95, 30, 0.0, 0.98, 0.95, 0.95],
        "expected_level": "high",
        "expected_score_range": (61, 100)
    }
]

def test_model_locally():
    """Test model directly without API"""
    import pickle
    
    print("=" * 60)
    print("GOLDEN UNIT TESTS - Local Model Testing")
    print("=" * 60)
    
    # Load model
    with open('procrastination-model.pkl', 'rb') as f:
        model_data = pickle.load(f)
    
    model = model_data['model']
    scaler = model_data['scaler']
    
    passed = 0
    failed = 0
    
    for test in TEST_CASES:
        print(f"\nTest: {test['name']}")
        print(f"Features: {test['features']}")
        
        # Predict
        features_array = np.array(test['features']).reshape(1, -1)
        features_scaled = scaler.transform(features_array)
        prediction_class = model.predict(features_scaled)[0]
        probabilities = model.predict_proba(features_scaled)[0]
        
        # Map to score
        score_map = {0: (0, 30), 1: (31, 60), 2: (61, 100)}
        min_score, max_score = score_map[int(prediction_class)]
        confidence = probabilities[int(prediction_class)]
        score = int(min_score + (max_score - min_score) * confidence)
        
        # Determine level
        if score <= 30:
            level = "low"
        elif score <= 60:
            level = "moderate"
        else:
            level = "high"
        
        # Check expectations
        level_match = level == test['expected_level']
        score_in_range = test['expected_score_range'][0] <= score <= test['expected_score_range'][1]
        
        if level_match and score_in_range:
            print(f"✅ PASS - Score: {score}, Level: {level}, Confidence: {confidence:.2f}")
            passed += 1
        else:
            print(f"❌ FAIL - Score: {score}, Level: {level}, Expected: {test['expected_level']} in range {test['expected_score_range']}")
            failed += 1
    
    print("\n" + "=" * 60)
    print(f"Results: {passed} passed, {failed} failed")
    print("=" * 60)
    return failed == 0

def test_api(base_url="http://localhost:8000"):
    """Test via FastAPI endpoint"""
    print("\n" + "=" * 60)
    print("GOLDEN UNIT TESTS - API Testing")
    print(f"Testing against: {base_url}")
    print("=" * 60)
    
    try:
        # Check health
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code != 200:
            print(f"❌ Health check failed: {response.status_code}")
            return False
        print("✅ Health check passed")
        
        passed = 0
        failed = 0
        
        for test in TEST_CASES:
            print(f"\nTest: {test['name']}")
            
            # Call API
            response = requests.post(
                f"{base_url}/features",
                json={"features": test['features']},
                timeout=5
            )
            
            if response.status_code != 200:
                print(f"❌ API call failed: {response.status_code}")
                failed += 1
                continue
            
            result = response.json()
            score = result['score']
            level = result['level']
            confidence = result['confidence']
            
            # Check expectations
            level_match = level == test['expected_level']
            score_in_range = test['expected_score_range'][0] <= score <= test['expected_score_range'][1]
            
            if level_match and score_in_range:
                print(f"✅ PASS - Score: {score}, Level: {level}, Confidence: {confidence:.2f}")
                passed += 1
            else:
                print(f"❌ FAIL - Score: {score}, Level: {level}, Expected: {test['expected_level']} in range {test['expected_score_range']}")
                failed += 1
        
        print("\n" + "=" * 60)
        print(f"Results: {passed} passed, {failed} failed")
        print("=" * 60)
        return failed == 0
    
    except requests.exceptions.ConnectionError:
        print(f"❌ Could not connect to {base_url}")
        print("Make sure the FastAPI service is running:")
        print("  cd ml && python main.py")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    import sys
    
    # Run local test
    print("Running local model tests...")
    local_passed = test_model_locally()
    
    # Run API test if --api flag provided
    if "--api" in sys.argv:
        api_passed = test_api()
        sys.exit(0 if (local_passed and api_passed) else 1)
    else:
        print("\nTo test the API endpoint, run: python test_model.py --api")
        sys.exit(0 if local_passed else 1)
