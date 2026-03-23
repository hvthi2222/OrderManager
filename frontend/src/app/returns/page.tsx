"use client";

import { useState, useRef, useEffect } from "react";
import api from "@/lib/api";
import { ScanResponse, ReturnEvaluation } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import BarcodeScanner from "@/components/BarcodeScanner";
import {
    ScanBarcode,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Loader2,
    RotateCcw,
    ShieldAlert,
    PackageX,
    Shuffle,
} from "lucide-react";
import { toast } from "sonner";
import VideoRecorder from "@/components/VideoRecorder";

export default function ReturnsPage() {
    const [trackingCode, setTrackingCode] = useState("");
    const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
    const [scanning, setScanning] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [todayStats, setTodayStats] = useState({ packedToday: 0, returnedToday: 0 });
    const [videoUploaded, setVideoUploaded] = useState(false);
    const [evaluation, setEvaluation] = useState<ReturnEvaluation>("NORMAL");
    const [returnNote, setReturnNote] = useState("");
    const [showScanner, setShowScanner] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const loadStats = async () => {
        try {
            const res = await api.get("/packing/stats-today");
            setTodayStats(res.data);
        } catch (err) {
            console.error("Lỗi load stats", err);
        }
    };

    useEffect(() => {
        inputRef.current?.focus();
        loadStats();
    }, []);

    const runScan = async (code: string) => {
        if (!code.trim()) return;
        setScanning(true);
        try {
            const res = await api.post<ScanResponse>("/packing/scan", null, {
                params: { trackingCode: code.trim(), mode: "RETURN" },
            });
            setScanResult(res.data);
            if (!res.data.valid) {
                toast.error(res.data.alertMessage || "Mã không hợp lệ");
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Lỗi quét mã");
        } finally {
            setScanning(false);
        }
    };

    const handleScan = (e: React.FormEvent) => {
        e.preventDefault();
        runScan(trackingCode);
    };

    const handleConfirm = async () => {
        if (!scanResult?.order) return;
        setConfirming(true);
        try {
            await api.post("/packing/confirm", null, {
                params: {
                    trackingCode: scanResult.order.trackingCode,
                    mode: "RETURN",
                    evaluation,
                    returnNote: returnNote.trim() || undefined,
                },
            });
            const evalLabel = evaluation === "NORMAL" ? "" : " ⚠️ NGHI VẤN";
            toast.success(`✅ Đã xử lý đơn hoàn: ${scanResult.order.trackingCode}${evalLabel}`);
            loadStats();
            setScanResult(null);
            setTrackingCode("");
            setVideoUploaded(false);
            setEvaluation("NORMAL");
            setReturnNote("");
            inputRef.current?.focus();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Lỗi xác nhận");
        } finally {
            setConfirming(false);
        }
    };

    const reset = () => {
        setScanResult(null);
        setTrackingCode("");
        setVideoUploaded(false);
        setEvaluation("NORMAL");
        setReturnNote("");
        inputRef.current?.focus();
    };

    const evaluationOptions = [
        {
            value: "NORMAL" as ReturnEvaluation,
            label: "Bình thường",
            desc: "Đơn hoàn hàng đủ, không vấn đề",
            icon: CheckCircle2,
            color: "border-green-200 bg-green-50/50 dark:bg-green-950/20",
            activeColor: "border-green-500 bg-green-100 dark:bg-green-900/40 ring-2 ring-green-500/30",
            iconColor: "text-green-600",
        },
        {
            value: "SUSPICIOUS_LOST" as ReturnEvaluation,
            label: "Nghi mất hàng",
            desc: "Kiện hàng trống hoặc thiếu hàng",
            icon: PackageX,
            color: "border-amber-200 bg-amber-50/50 dark:bg-amber-950/20",
            activeColor: "border-amber-500 bg-amber-100 dark:bg-amber-900/40 ring-2 ring-amber-500/30",
            iconColor: "text-amber-600",
        },
        {
            value: "SUSPICIOUS_SWAPPED" as ReturnEvaluation,
            label: "Nghi tráo hàng",
            desc: "Hàng bên trong khác với mô tả",
            icon: Shuffle,
            color: "border-red-200 bg-red-50/50 dark:bg-red-950/20",
            activeColor: "border-red-500 bg-red-100 dark:bg-red-900/40 ring-2 ring-red-500/30",
            iconColor: "text-red-600",
        },
    ];

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="text-center">
                <h1 className="text-2xl font-bold tracking-tight flex items-center justify-center gap-2">
                    <RotateCcw className="h-6 w-6 text-rose-600" />
                    Xử lý đơn hoàn
                </h1>
                <p className="text-muted-foreground mt-1">Quét mã đơn hoàn để kiểm tra tình trạng</p>
            </div>

            <div className="flex justify-center">
                <Badge variant="secondary" className="text-base px-4 py-1.5">
                    Đã xử lý hôm nay: <span className="font-bold ml-1 text-primary">{todayStats.returnedToday}</span>
                </Badge>
            </div>

            <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                    <form onSubmit={handleScan} className="flex gap-3">
                        <div className="relative flex-1">
                            <Input
                                ref={inputRef}
                                value={trackingCode}
                                onChange={(e) => setTrackingCode(e.target.value)}
                                placeholder="Quét hoặc nhập mã vận đơn hoàn..."
                                className="pl-3 h-12 text-lg font-mono"
                                autoFocus
                            />
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-12 w-12"
                            onClick={() => setShowScanner(true)}
                        >
                            <ScanBarcode className="h-5 w-5" />
                        </Button>
                        <Button type="submit" className="h-12 px-6" disabled={scanning || !trackingCode.trim()}>
                            {scanning ? <Loader2 className="h-5 w-5 animate-spin" /> : "Xác nhận"}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {scanResult && (
                <Card className={`border-2 shadow-sm ${scanResult.valid ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"}`}>
                    <CardContent className="p-6">
                        {!scanResult.valid && (
                            <div className="flex items-start gap-3 mb-4 p-3 rounded-lg bg-red-100/80">
                                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                                <p className="font-medium text-sm text-red-800">{scanResult.alertMessage}</p>
                            </div>
                        )}

                        {/* Order info and Camera Grid */}
                        {scanResult.order && (
                            <div className="grid lg:grid-cols-2 gap-8">
                                {/* Left Column: Info + Evaluation + Actions */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        {scanResult.valid ? (
                                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                                        ) : (
                                            <XCircle className="h-5 w-5 text-red-600" />
                                        )}
                                        <span className="font-mono font-bold text-lg">{scanResult.order.trackingCode}</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <span className="text-muted-foreground">Khách hàng:</span>
                                            <p className="font-medium">{scanResult.order.customerName || "—"}</p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Sàn:</span>
                                            <p className="font-medium text-blue-600 font-bold">{scanResult.order.platform}</p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Ngày hoàn:</span>
                                            <p className="font-medium">
                                                {scanResult.order.returnedAt
                                                    ? new Date(scanResult.order.returnedAt).toLocaleDateString("vi-VN")
                                                    : "—"}
                                            </p>
                                        </div>
                                        {scanResult.order.shippingCarrier && (
                                            <div>
                                                <span className="text-muted-foreground">Vận chuyển:</span>
                                                <p className="font-medium">{scanResult.order.shippingCarrier}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Return reason info */}
                                    {(scanResult.order.cancelReason || scanResult.order.buyerNote || scanResult.order.returnRefundStatus) && (
                                        <div className="border rounded-lg overflow-hidden">
                                            <div className="bg-rose-50 dark:bg-rose-950/20 px-4 py-2 border-b">
                                                <h3 className="text-sm font-semibold text-rose-800 dark:text-rose-300 flex items-center gap-2">
                                                    <AlertTriangle className="h-4 w-4" /> Thông tin hoàn hàng
                                                </h3>
                                            </div>
                                            <div className="p-3 space-y-2 text-sm">
                                                {scanResult.order.returnRefundStatus && (
                                                    <div>
                                                        <span className="text-muted-foreground">Trạng thái hoàn:</span>
                                                        <p className="font-medium">{scanResult.order.returnRefundStatus}</p>
                                                    </div>
                                                )}
                                                {scanResult.order.cancelReason && (
                                                    <div>
                                                        <span className="text-muted-foreground">Lý do hủy/hoàn:</span>
                                                        <p className="font-medium text-rose-700 dark:text-rose-400">{scanResult.order.cancelReason}</p>
                                                    </div>
                                                )}
                                                {scanResult.order.buyerNote && (
                                                    <div>
                                                        <span className="text-muted-foreground">Nhận xét người mua:</span>
                                                        <p className="font-medium italic">&ldquo;{scanResult.order.buyerNote}&rdquo;</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Product items list for return check */}
                                    {scanResult.order.items && scanResult.order.items.length > 0 && (
                                        <div className="border rounded-lg overflow-hidden">
                                            <div className="bg-muted/50 px-4 py-2 border-b">
                                                <h3 className="text-sm font-semibold flex items-center gap-2">
                                                    <RotateCcw className="h-4 w-4" /> Sản phẩm cần kiểm tra ({scanResult.order.items.length})
                                                </h3>
                                            </div>
                                            <div className="divide-y max-h-[150px] overflow-y-auto">
                                                {scanResult.order.items.map((item) => (
                                                    <div key={item.id} className="flex items-center gap-3 px-4 py-2">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium">{item.productName}</p>
                                                            {item.variantName && (
                                                                <p className="text-xs text-muted-foreground">{item.variantName}</p>
                                                            )}
                                                        </div>
                                                        <Badge variant="outline" className="shrink-0">×{item.quantity}</Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Return Evaluation */}
                                    {scanResult.valid && (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <ShieldAlert className="h-4 w-4 text-primary" />
                                                <Label className="text-sm font-medium">Đánh giá đơn hoàn</Label>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {evaluationOptions.map((option) => {
                                                    const Icon = option.icon;
                                                    const isActive = evaluation === option.value;
                                                    return (
                                                        <button
                                                            key={option.value}
                                                            type="button"
                                                            onClick={() => setEvaluation(option.value)}
                                                            className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all text-left ${isActive ? option.activeColor : option.color
                                                                } hover:opacity-90`}
                                                        >
                                                            <Icon className={`h-4 w-4 shrink-0 ${option.iconColor}`} />
                                                            <div>
                                                                <p className="font-medium text-xs">{option.label}</p>
                                                                <p className="text-[10px] text-muted-foreground leading-tight">{option.desc}</p>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {/* Note for suspicious evaluations */}
                                            {evaluation !== "NORMAL" && (
                                                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
                                                    <Label className="text-sm">Ghi chú (mô tả chi tiết)</Label>
                                                    <textarea
                                                        value={returnNote}
                                                        onChange={(e) => setReturnNote(e.target.value)}
                                                        placeholder="Mô tả tình trạng kiện hàng, hình ảnh bên trong..."
                                                        className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Actions (Left Column) */}
                                    {scanResult.valid && (
                                        <div className="flex gap-3 mt-4 pt-4 border-t">
                                            <Button onClick={handleConfirm} disabled={confirming || !videoUploaded} className="flex-1 h-12 text-lg">
                                                {confirming ? (
                                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                ) : (
                                                    <CheckCircle2 className="mr-2 h-5 w-5" />
                                                )}
                                                {videoUploaded ? "XÁC NHẬN KIỂM HOÀN" : "Chưa quay video"}
                                            </Button>
                                            <Button variant="outline" onClick={reset} className="h-12 px-6">
                                                Bỏ qua
                                            </Button>
                                        </div>
                                    )}

                                    {!scanResult.valid && (
                                        <div className="mt-4 pt-4 border-t">
                                            <Button variant="outline" onClick={reset} className="w-full h-11">
                                                Quét mã khác
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {/* Right Column: Camera */}
                                <div className="space-y-4">
                                    <div className="bg-muted/30 rounded-lg p-1">
                                        {scanResult.valid && (
                                            <VideoRecorder
                                                trackingCode={scanResult.order.trackingCode}
                                                videoType="RETURN_CHECK"
                                                onUploaded={() => setVideoUploaded(true)}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {!scanResult.order && (
                            <div className="text-center py-2">
                                <Button variant="outline" onClick={reset}>Quét lại</Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
            {showScanner && (
                <BarcodeScanner
                    onDetected={(code) => {
                        setTrackingCode(code);
                        setShowScanner(false);
                        inputRef.current?.focus();
                    }}
                    onClose={() => setShowScanner(false)}
                />
            )}
        </div>
    );
}
