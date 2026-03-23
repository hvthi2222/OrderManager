"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { ScanResponse, Order, OrderItem } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import BarcodeScanner from "@/components/BarcodeScanner";
import {
    ScanBarcode,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Video,
    Loader2,
    PackageCheck,
    MessageSquare,
    Truck,
} from "lucide-react";
import { toast } from "sonner";
import VideoRecorder from "@/components/VideoRecorder";

export default function PackingPage() {
    const [trackingCode, setTrackingCode] = useState("");
    const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
    const [scanning, setScanning] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [todayStats, setTodayStats] = useState({ packedToday: 0, returnedToday: 0 });
    const [videoUploaded, setVideoUploaded] = useState(false);
    const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
    const [showScanner, setShowScanner] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const loadStats = useCallback(async () => {
        try {
            const res = await api.get("/packing/stats-today");
            setTodayStats(res.data);
        } catch (err) {
            console.error("Lỗi load stats", err);
        }
    }, []);

    useEffect(() => {
        inputRef.current?.focus();
        loadStats();
    }, [loadStats]);

    const runScan = async (code: string) => {
        if (!code.trim()) return;
        setScanning(true);
        setCheckedItems(new Set());
        try {
            const res = await api.post<ScanResponse>("/packing/scan", null, {
                params: { trackingCode: code.trim(), mode: "PACK" },
            });
            setScanResult(res.data);

            // Pre-check items that are already checked from server
            if (res.data.order?.items) {
                const preChecked = new Set<number>();
                res.data.order.items.forEach((item) => {
                    if (item.checked) preChecked.add(item.id);
                });
                setCheckedItems(preChecked);
            }

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

    const toggleItem = async (itemId: number) => {
        try {
            await api.post(`/packing/check-item/${itemId}`);
            setCheckedItems((prev) => {
                const next = new Set(prev);
                if (next.has(itemId)) {
                    next.delete(itemId);
                } else {
                    next.add(itemId);
                }
                return next;
            });
        } catch (err: any) {
            toast.error("Lỗi cập nhật");
        }
    };

    const allItemsChecked =
        !scanResult?.order?.items?.length ||
        scanResult.order.items.every((item) => checkedItems.has(item.id));

    const handleConfirm = async () => {
        if (!scanResult?.order) return;
        setConfirming(true);
        try {
            await api.post("/packing/confirm", null, {
                params: { trackingCode: scanResult.order.trackingCode, mode: "PACK" },
            });
            toast.success(`✅ Đã đóng đơn: ${scanResult.order.trackingCode}`);
            loadStats();
            setScanResult(null);
            setTrackingCode("");
            setVideoUploaded(false);
            setCheckedItems(new Set());
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
        setCheckedItems(new Set());
        inputRef.current?.focus();
    };

    const order = scanResult?.order;

    const getRiskInfo = (risk: number | null | undefined) => {
        if (risk === null || risk === undefined) return null;
        if (risk < 15) return { label: "Rủi ro thấp", color: "bg-green-100 text-green-700 border-green-200" };
        if (risk < 30) return { label: "Rủi ro trung bình", color: "bg-yellow-100 text-yellow-700 border-yellow-200" };
        return { label: "Rủi ro CAO", color: "bg-red-100 text-red-700 border-red-200 animate-pulse font-bold" };
    };

    const riskInfo = getRiskInfo(order?.predictionRisk);

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="text-center">
                <h1 className="text-2xl font-bold tracking-tight flex items-center justify-center gap-2">
                    <PackageCheck className="h-6 w-6 text-blue-600" />
                    Đóng đơn gửi
                </h1>
                <p className="text-muted-foreground mt-1">Quét mã vận đơn để bắt đầu</p>
            </div>

            {/* Counter */}
            <div className="flex justify-center">
                <Badge variant="secondary" className="text-base px-4 py-1.5">
                    Đã đóng hôm nay: <span className="font-bold ml-1 text-primary">{todayStats.packedToday}</span>
                </Badge>
            </div>

            {/* Scanner Input */}
            <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                    <form onSubmit={handleScan} className="flex gap-3">
                        <div className="relative flex-1">
                            <Input
                                ref={inputRef}
                                value={trackingCode}
                                onChange={(e) => setTrackingCode(e.target.value)}
                                placeholder="Quét hoặc nhập mã vận đơn..."
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

            {/* Result */}
            {scanResult && (
                <Card className={`border-2 shadow-sm ${scanResult.valid ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"}`}>
                    <CardContent className="p-6">
                        {/* Alert banner */}
                        {!scanResult.valid && (
                            <div className="flex items-start gap-3 mb-4 p-3 rounded-lg bg-red-100/80">
                                {scanResult.alertType === "ALREADY_PACKED" && <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />}
                                {scanResult.alertType === "NOT_FOUND" && <XCircle className="h-5 w-5 text-red-600 mt-0.5" />}
                                {scanResult.alertType === "WRONG_TYPE" && <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />}
                                <div>
                                    <p className="font-medium text-sm text-red-800">{scanResult.alertMessage}</p>
                                </div>
                            </div>
                        )}

                        {/* Order info and Camera Grid */}
                        {order && (
                            <div className="grid lg:grid-cols-2 gap-8">
                                {/* Left Column: Info + Checklist + Actions */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        {scanResult.valid ? (
                                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                                        ) : (
                                            <XCircle className="h-5 w-5 text-red-600" />
                                        )}
                                        <span className="font-mono font-bold text-lg">{order.trackingCode}</span>
                                        {riskInfo && (
                                            <Badge variant="outline" className={`ml-2 px-2 py-0 ${riskInfo.color}`}>
                                                AI: {riskInfo.label} ({order.predictionRisk?.toFixed(0)}%)
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <span className="text-muted-foreground">Khách hàng:</span>
                                            <p className="font-medium">{order.customerName || "—"}</p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">SĐT:</span>
                                            <p className="font-medium">{order.customerPhone || "—"}</p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Sàn:</span>
                                            <p className="font-medium text-blue-600 font-bold">{order.platform}</p>
                                        </div>
                                        {order.shippingCarrier && (
                                            <div>
                                                <span className="text-muted-foreground flex items-center gap-1">
                                                    <Truck className="h-3.5 w-3.5" /> Vận chuyển:
                                                </span>
                                                <p className="font-medium">{order.shippingCarrier}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Customer note */}
                                    {order.note && (
                                        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                                            <MessageSquare className="h-4 w-4 text-amber-600 mt-0.5" />
                                            <div>
                                                <p className="text-xs font-medium text-amber-800">Ghi chú KH:</p>
                                                <p className="text-sm text-amber-900">{order.note}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Product Checklist */}
                                    {order.items && order.items.length > 0 && (
                                        <div className="border rounded-lg overflow-hidden">
                                            <div className="bg-muted/50 px-4 py-2 border-b">
                                                <h3 className="text-sm font-semibold flex items-center gap-2">
                                                    📦 Kiểm đếm sản phẩm
                                                    <Badge variant={allItemsChecked ? "default" : "outline"} className="text-xs">
                                                        {checkedItems.size}/{order.items.length}
                                                    </Badge>
                                                </h3>
                                            </div>
                                            <div className="divide-y max-h-[300px] overflow-y-auto">
                                                {order.items.map((item) => (
                                                    <label
                                                        key={item.id}
                                                        className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors ${checkedItems.has(item.id) ? "bg-green-50/50" : ""
                                                            }`}
                                                    >
                                                        <Checkbox
                                                            checked={checkedItems.has(item.id)}
                                                            onCheckedChange={() => toggleItem(item.id)}
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-sm font-medium ${checkedItems.has(item.id) ? "line-through text-muted-foreground" : ""}`}>
                                                                {item.productName}
                                                            </p>
                                                            {item.variantName && (
                                                                <p className="text-xs text-muted-foreground">{item.variantName}</p>
                                                            )}
                                                        </div>
                                                        <Badge variant="outline" className="shrink-0">
                                                            ×{item.quantity}
                                                        </Badge>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Fallback productInfo */}
                                    {(!order.items || order.items.length === 0) && order.productInfo && (
                                        <div className="text-sm p-3 border rounded-lg">
                                            <span className="text-muted-foreground">Sản phẩm:</span>
                                            <p className="font-medium">{order.productInfo}</p>
                                        </div>
                                    )}

                                    {/* Actions (Left Column) */}
                                    {scanResult.valid && (
                                        <div className="flex gap-3 mt-4 pt-4 border-t">
                                            <Button
                                                onClick={handleConfirm}
                                                disabled={confirming || !videoUploaded || !allItemsChecked}
                                                className="flex-1 h-12 text-lg"
                                            >
                                                {confirming ? (
                                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                ) : (
                                                    <CheckCircle2 className="mr-2 h-5 w-5" />
                                                )}
                                                {!allItemsChecked
                                                    ? "Chưa kiểm xong"
                                                    : !videoUploaded
                                                        ? "Chưa quay video"
                                                        : "XÁC NHẬN ĐÓNG ĐƠN"}
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
                                                trackingCode={order.trackingCode}
                                                videoType="PACK"
                                                onUploaded={() => setVideoUploaded(true)}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Not found — no order */}
                        {!order && (
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
                        // user bấm "Xác nhận" để gửi mã, không auto scan
                        inputRef.current?.focus();
                    }}
                    onClose={() => setShowScanner(false)}
                />
            )}
        </div>
    );
}
