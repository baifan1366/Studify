#!/usr/bin/env python3
"""
AI Text Detection FastAPI Server Launcher
启动 AI 文本检测 FastAPI 服务器
"""
import uvicorn
import os
import sys
from pathlib import Path

# 确保当前目录在 Python 路径中
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

def main():
    """启动 FastAPI 服务器"""
    print("🚀 Starting AI Text Detection API Server...")
    print("📝 API Documentation will be available at: http://localhost:8000/docs")
    print("🔍 Health check endpoint: http://localhost:8000/health")
    print("🤖 Detection endpoint: http://localhost:8000/detect")
    print("=" * 50)
    
    try:
        # 启动服务器
        uvicorn.run(
            "detect:app",  # 指向 detect.py 中的 app 实例
            host="0.0.0.0",
            port=8000,
            reload=True,
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Failed to start server: {e}")

if __name__ == "__main__":
    main()
