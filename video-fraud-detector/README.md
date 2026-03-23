# Video Fraud Detector

Backend Python (FastAPI + OpenCV) phát hiện hành vi gian lận trong video chứng cứ.

## Cài đặt

```bash
cd video-fraud-detector
pip install -r requirements.txt
```

## Chạy

```bash
uvicorn app.main:app --reload --port 8001
```

## API

- `POST /api/analyze` - Gửi video_url, video_id, callback_url để phân tích (trả 202 ngay, xử lý nền)
- `GET /health` - Health check

## Phát hiện

1. **Che camera**: Độ sáng thấp bất thường
2. **Rung quá mức**: Frame difference cao giữa các frame
3. **Video cắt bất thường**: Jump cuts (thay đổi nội dung đột ngột)
