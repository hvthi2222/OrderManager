"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Video,
    VideoOff,
    Circle,
    Square,
    Upload,
    Loader2,
    RotateCcw,
    Camera,
    CloudUpload,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

interface VideoRecorderProps {
    trackingCode: string;
    videoType: "PACK" | "RETURN_CHECK";
    onUploaded?: () => void;
}

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";

export default function VideoRecorder({
    trackingCode,
    videoType,
    onUploaded,
}: VideoRecorderProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const [stream, setStream] = useState<MediaStream | null>(null);
    const [recording, setRecording] = useState(false);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Start camera
    const startCamera = useCallback(async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false,
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            toast.error("Không thể truy cập camera. Vui lòng cấp quyền.");
        }
    }, []);

    // Stop camera
    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStream(null);
        }
    }, [stream]);

    // Start recording
    const startRecording = useCallback(() => {
        if (!stream) return;

        chunksRef.current = [];
        const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
            ? "video/webm;codecs=vp9"
            : "video/webm";

        const mediaRecorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                chunksRef.current.push(e.data);
            }
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: mimeType });
            setRecordedBlob(blob);
            setRecordedUrl(URL.createObjectURL(blob));
        };

        mediaRecorder.start(1000);
        setRecording(true);
        setDuration(0);

        timerRef.current = setInterval(() => {
            setDuration((prev) => prev + 1);
        }, 1000);
    }, [stream]);

    // Stop recording
    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && recording) {
            mediaRecorderRef.current.stop();
            setRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    }, [recording]);

    // Upload to Cloudinary then save record to backend
    const uploadVideo = useCallback(async () => {
        if (!recordedBlob) return;
        if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
            toast.error("Chưa cấu hình Cloudinary. Kiểm tra NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME và NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.");
            return;
        }

        setUploading(true);
        setUploadProgress(0);

        try {
            // Step 1: Upload to Cloudinary
            const formData = new FormData();
            formData.append("file", recordedBlob, `${videoType.toLowerCase()}_${trackingCode}.webm`);
            formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
            formData.append("folder", `ordermanager/videos/${trackingCode}`);
            formData.append("resource_type", "video");

            const cloudinaryRes = await new Promise<any>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`);

                // Fix cross-origin referrer policy
                xhr.withCredentials = false;

                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        setUploadProgress(Math.round((e.loaded / e.total) * 100));
                    }
                };

                xhr.onload = () => {
                    if (xhr.status === 200) {
                        resolve(JSON.parse(xhr.responseText));
                    } else {
                        reject(new Error(`Cloudinary error: ${xhr.status} - ${xhr.responseText}`));
                    }
                };

                xhr.onerror = () => reject(new Error("Network error khi upload Cloudinary"));
                xhr.send(formData);
            });

            // Step 2: Save record to backend
            await api.post("/videos/save", {
                trackingCode,
                videoType,
                cloudinaryUrl: cloudinaryRes.secure_url,
                cloudinaryPublicId: cloudinaryRes.public_id,
                fileSize: cloudinaryRes.bytes,
            });

            toast.success("📹 Video đã upload lên Cloudinary thành công!");
            resetRecording();
            onUploaded?.();
        } catch (err: any) {
            toast.error(err.message || "Lỗi upload video lên Cloudinary");
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    }, [recordedBlob, trackingCode, videoType, onUploaded]);

    // Reset recording
    const resetRecording = useCallback(() => {
        setRecordedBlob(null);
        if (recordedUrl) URL.revokeObjectURL(recordedUrl);
        setRecordedUrl(null);
        setDuration(0);
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [recordedUrl, stream]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopCamera();
            if (timerRef.current) clearInterval(timerRef.current);
            if (recordedUrl) URL.revokeObjectURL(recordedUrl);
        };
    }, []);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, "0");
        const s = (seconds % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    };

    return (
        <Card className="border-0 shadow-sm mt-4">
            <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                        <Camera className="h-4 w-4 text-primary" />
                        Video bằng chứng
                    </h4>
                    {recording && (
                        <span className="flex items-center gap-1.5 text-sm text-red-600 font-medium">
                            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                            REC {formatTime(duration)}
                        </span>
                    )}
                </div>

                {/* Video preview */}
                <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                    {!stream && !recordedUrl ? (
                        <div className="flex flex-col items-center justify-center h-full gap-2">
                            <VideoOff className="h-10 w-10 text-muted-foreground/30" />
                            <Button variant="outline" size="sm" onClick={startCamera}>
                                <Camera className="mr-2 h-4 w-4" />
                                Bật Camera
                            </Button>
                        </div>
                    ) : recordedUrl ? (
                        <video
                            src={recordedUrl}
                            controls
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full h-full object-cover mirror"
                        />
                    )}

                    {/* Recording indicator overlay */}
                    {recording && (
                        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-red-600/90 text-white text-xs px-2 py-1 rounded-full">
                            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                            {formatTime(duration)}
                        </div>
                    )}
                </div>

                {/* Upload progress bar */}
                {uploading && uploadProgress > 0 && (
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <CloudUpload className="h-3 w-3" />
                                Đang upload lên Cloudinary...
                            </span>
                            <span>{uploadProgress}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                                className="h-full bg-primary rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Controls */}
                <div className="flex gap-2 justify-center">
                    {!stream && !recordedUrl && (
                        <Button variant="outline" size="sm" onClick={startCamera}>
                            <Camera className="mr-1 h-3.5 w-3.5" /> Bật Camera
                        </Button>
                    )}

                    {stream && !recording && !recordedUrl && (
                        <>
                            <Button
                                size="sm"
                                onClick={startRecording}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                <Circle className="mr-1 h-3.5 w-3.5 fill-current" /> Bắt đầu quay
                            </Button>
                            <Button variant="outline" size="sm" onClick={stopCamera}>
                                <VideoOff className="mr-1 h-3.5 w-3.5" /> Tắt Camera
                            </Button>
                        </>
                    )}

                    {recording && (
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={stopRecording}
                        >
                            <Square className="mr-1 h-3.5 w-3.5 fill-current" /> Dừng quay
                        </Button>
                    )}

                    {recordedUrl && !uploading && (
                        <>
                            <Button size="sm" onClick={uploadVideo}>
                                <CloudUpload className="mr-1 h-3.5 w-3.5" /> Upload Cloudinary
                            </Button>
                            <Button variant="outline" size="sm" onClick={resetRecording}>
                                <RotateCcw className="mr-1 h-3.5 w-3.5" /> Quay lại
                            </Button>
                        </>
                    )}

                    {uploading && (
                        <Button size="sm" disabled>
                            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Đang upload...
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
