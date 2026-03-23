"""
Video fraud analysis using OpenCV.
Detects: camera obscuring, excessive shake, abnormal cuts.
"""
import logging
import cv2
import numpy as np
from app.schemas import CallbackPayload

logger = logging.getLogger(__name__)

# Thresholds (tune based on real videos)
BRIGHTNESS_OBSCURED_THRESHOLD = 30  # Mean brightness below this = possibly obscured
OBSCURED_FRAME_RATIO = 0.3  # At least 30% of frames dark to flag
MOTION_SHAKE_THRESHOLD = 18  # Mean frame diff above this = shake (lowered for sensitivity)
SHAKE_FRAME_RATIO = 0.15  # At least 15% of frames with high motion to flag
JUMP_CUT_DIFF_THRESHOLD = 50  # Sudden large diff = cut (lowered to catch edits)
JUMP_CUT_COUNT_THRESHOLD = 1  # 1+ jump cut to flag


def analyze_video(video_url: str) -> CallbackPayload:
    """
    Analyze video from URL for fraud indicators.
    Returns CallbackPayload with detection results.
    """
    logger.info("Analyzing video: %s", video_url[:80] + "..." if len(video_url) > 80 else video_url)
    cap = cv2.VideoCapture(video_url)

    if not cap.isOpened():
        logger.error("Cannot open video: %s", video_url)
        return CallbackPayload(
            video_id=0,
            obscured=False,
            excessive_shake=False,
            abnormal_cut=False,
            messages=["Không thể mở video để phân tích"],
            confidence=0.0,
        )

    obscured_count = 0
    shake_count = 0
    jump_cut_count = 0
    frame_count = 0
    prev_gray = None
    motion_scores: list[float] = []
    jump_cut_frames: list[int] = []
    brightness_values: list[float] = []

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            frame_count += 1
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

            # 1. Camera obscured: low mean brightness
            mean_brightness = float(np.mean(gray))
            brightness_values.append(mean_brightness)
            if mean_brightness < BRIGHTNESS_OBSCURED_THRESHOLD:
                obscured_count += 1

            # 2. Excessive shake + 3. Jump cut: frame-to-frame difference
            if prev_gray is not None:
                diff = cv2.absdiff(gray, prev_gray)
                motion_score = float(np.mean(diff))
                motion_scores.append(motion_score)

                if motion_score > MOTION_SHAKE_THRESHOLD:
                    shake_count += 1
                if motion_score > JUMP_CUT_DIFF_THRESHOLD:
                    jump_cut_count += 1
                    jump_cut_frames.append(frame_count)

            prev_gray = gray.copy()

    finally:
        cap.release()

    # Log metrics
    avg_brightness = float(np.mean(brightness_values)) if brightness_values else 0
    avg_motion = float(np.mean(motion_scores)) if motion_scores else 0
    max_motion = float(np.max(motion_scores)) if motion_scores else 0

    obscured_ratio = obscured_count / frame_count if frame_count > 0 else 0
    shake_ratio = shake_count / frame_count if frame_count > 0 else 0

    _obscured = frame_count > 0 and obscured_ratio >= OBSCURED_FRAME_RATIO
    _shake = frame_count > 0 and shake_ratio >= SHAKE_FRAME_RATIO
    _cut = jump_cut_count >= JUMP_CUT_COUNT_THRESHOLD

    logger.info(
        "[FRAUD_ANALYZE] frames=%d | "
        "obscured: count=%d ratio=%.2f (need>=%.2f) bright_avg=%.1f => %s | "
        "shake: count=%d ratio=%.2f (need>=%.2f) motion_avg=%.1f max=%.1f => %s | "
        "cut: count=%d (need>=%d) frames=%s => %s",
        frame_count,
        obscured_count,
        obscured_ratio,
        OBSCURED_FRAME_RATIO,
        avg_brightness,
        _obscured,
        shake_count,
        shake_ratio,
        SHAKE_FRAME_RATIO,
        avg_motion,
        max_motion,
        _shake,
        jump_cut_count,
        JUMP_CUT_COUNT_THRESHOLD,
        jump_cut_frames[:15] if len(jump_cut_frames) > 15 else jump_cut_frames,
        _cut,
    )

    # Build result
    obscured = _obscured
    excessive_shake = _shake
    abnormal_cut = _cut

    messages: list[str] = []
    if obscured:
        messages.append("Phát hiện che khuất camera (độ sáng thấp bất thường)")
    if excessive_shake:
        messages.append("Phát hiện rung camera quá mức")
    if abnormal_cut:
        messages.append("Phát hiện video có thể bị cắt/chỉnh sửa bất thường")

    fraud_detected = obscured or excessive_shake or abnormal_cut
    if fraud_detected:
        messages.insert(0, "Có hành vi che khuất bất thường")

    confidence = 0.85 if fraud_detected else 0.9

    return CallbackPayload(
        video_id=0,  # Set by caller
        obscured=obscured,
        excessive_shake=excessive_shake,
        abnormal_cut=abnormal_cut,
        messages=messages,
        confidence=confidence,
    )
