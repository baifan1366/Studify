from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from app import detect_ai_text  # 导入 AI 检测函数

app = FastAPI(
    title="AI Text Detection API",
    description="API for detecting AI-generated text using DivEye model",
    version="1.0.0"
)

# 添加 CORS 中间件，允许前端调用
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 在生产环境中应该指定具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TextInput(BaseModel):
    text: str

class DetectionResponse(BaseModel):
    message: str
    ai_probability: float
    confidence: dict

@app.get("/")
def read_root():
    return {"message": "AI Text Detection API is running", "status": "healthy"}

@app.post("/detect", response_model=DetectionResponse)
def detect_api(input: TextInput):
    try:
        if not input.text or len(input.text.strip()) == 0:
            raise HTTPException(status_code=400, detail="Text input cannot be empty")
        
        message, ai_prob, bar_data = detect_ai_text(input.text)
        
        # 处理 bar_data DataFrame
        confidence_dict = {}
        if bar_data is not None and not bar_data.empty:
            confidence_dict = {
                row["Source"]: row["Probability (%)"] 
                for _, row in bar_data.iterrows()
            }
        
        return {
            "message": message,
            "ai_probability": float(ai_prob),
            "confidence": confidence_dict
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Detection failed: {str(e)}")

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "AI Text Detection"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
