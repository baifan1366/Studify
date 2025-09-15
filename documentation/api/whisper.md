🎙️ Faster Whisper API Docs

基于 faster-whisper
 的 FastAPI 服务，提供 语音转录 (ASR) 和 语音翻译 (translate) 功能。

✅ Health Check
GET https://edusocial-voice-to-text-server.hf.space/

检查服务是否正常运行。

Response

{
  "message": "Faster Whisper API is running"
}

📝 Speech-to-Text API
POST https://edusocial-voice-to-text-server.hf.space/transcribe

上传音频文件，返回转录或翻译后的文本。

Query Parameters
参数	类型	默认值	说明
task	string	transcribe	模式: transcribe = 转录为原语言，translate = 翻译为英文
beam_size	int	5	Beam search 的宽度 (1~10)
Request (multipart/form-data)

file: 音频文件 (推荐 .wav, .mp3, .m4a)

Example with curl:

curl -X POST "http://localhost:8000/transcribe?task=transcribe&beam_size=5" \
  -F "file=@sample.wav"

Response
{
  "language": "en",
  "duration": 12.34,
  "text": "Hello everyone, welcome to the meeting."
}


language: 检测到的语言 (ISO 639-1 code，例如 "en", "zh", "ja")

duration: 音频时长（秒）

text: 转录或翻译后的文本

⚙️ Deployment & Config
环境变量
变量名	默认值	说明
WHISPER_MODEL_SIZE	small	Whisper 模型大小 (tiny, base, small, medium, large-v2)
WHISPER_DEVICE	cpu	设备 (cpu, cuda)
WHISPER_COMPUTE_TYPE	int8	推理精度 (int8, int16, float16, float32)
缓存目录
HF_HOME=/tmp/hf
TRANSFORMERS_CACHE=/tmp/hf
HF_DATASETS_CACHE=/tmp/hf


这样会把模型和缓存放到 /tmp/hf，避免磁盘膨胀。