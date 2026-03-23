"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BarcodeScannerProps {
  onDetected: (code: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    let active = true;

    const start = async () => {
      try {
        await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          (result, err, controls) => {
            if (!active) return;
            if (result) {
              const text = result.getText().trim();
              if (text) {
                active = false;
                controls.stop();
                onDetected(text);
              }
            }
            if (err) {
              // ZXing sẽ ném NotFound liên tục khi chưa thấy mã - có thể bỏ qua.
              console.debug("ZXing scan error", err);
            }
          }
        );
      } catch (e: any) {
        console.error("Scanner init error", e);
        setError(e?.message || "Không thể bật camera. Vui lòng kiểm tra quyền truy cập.");
      }
    };

    start();

    return () => {
      active = false;
      const stream = videoRef.current?.srcObject as MediaStream | null;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [onDetected]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <Card className="w-[90vw] max-w-md overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base font-semibold">Quét mã bằng camera</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            ✕
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative aspect-video rounded-md overflow-hidden bg-black">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              muted
              playsInline
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="w-40 h-40 border-2 border-emerald-400/80 rounded-md shadow-[0_0_20px_rgba(16,185,129,0.7)]" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Đưa mã QR hoặc barcode vào trong khung. Hệ thống sẽ tự nhận khi đọc được mã.
          </p>
          {error && (
            <p className="text-xs text-red-600 text-center">
              {error}
            </p>
          )}
          <div className="flex justify-center pt-1">
            <Button variant="outline" size="sm" onClick={onClose}>
              Đóng
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

