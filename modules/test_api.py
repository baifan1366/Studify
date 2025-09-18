#!/usr/bin/env python3
"""
FastAPI 测试脚本
Test script for AI Text Detection API
"""
import requests
import json

def test_api():
    """测试 FastAPI 服务器"""
    base_url = "http://localhost:8000"
    
    print("🧪 Testing AI Text Detection API...")
    print("=" * 50)
    
    # 1. 测试健康检查
    try:
        print("1️⃣ Testing health check...")
        response = requests.get(f"{base_url}/health")
        if response.status_code == 200:
            print("✅ Health check passed")
            print(f"   Response: {response.json()}")
        else:
            print("❌ Health check failed")
            print(f"   Status code: {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to API server. Make sure it's running on port 8000")
        return
    
    # 2. 测试根路径
    try:
        print("\n2️⃣ Testing root endpoint...")
        response = requests.get(f"{base_url}/")
        if response.status_code == 200:
            print("✅ Root endpoint works")
            print(f"   Response: {response.json()}")
        else:
            print("❌ Root endpoint failed")
    except Exception as e:
        print(f"❌ Root endpoint error: {e}")
    
    # 3. 测试文本检测 API
    try:
        print("\n3️⃣ Testing text detection...")
        test_text = "This is a sample text that should be analyzed for AI detection. It contains multiple sentences to provide enough content for the model to analyze properly."
        
        payload = {"text": test_text}
        response = requests.post(
            f"{base_url}/detect", 
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            print("✅ Text detection API works")
            result = response.json()
            print(f"   Message: {result.get('message', 'N/A')}")
            print(f"   AI Probability: {result.get('ai_probability', 'N/A')}")
            print(f"   Confidence: {result.get('confidence', 'N/A')}")
        else:
            print("❌ Text detection failed")
            print(f"   Status code: {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"❌ Text detection error: {e}")
    
    print("\n" + "=" * 50)
    print("🏁 API testing completed!")
    print("📚 Visit http://localhost:8000/docs for interactive API documentation")

if __name__ == "__main__":
    test_api()
