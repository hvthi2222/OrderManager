"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { Order, PageResponse } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
    Search, Video, Calendar, PlayCircle, ExternalLink,
    ChevronLeft, ChevronRight, Loader2, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

export default function VideosPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [loading, setLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState("");
    const [platform, setPlatform] = useState("ALL");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Video Player
    const [selectedVideo, setSelectedVideo] = useState<{ url: string; title: string } | null>(null);
    const [playerOpen, setPlayerOpen] = useState(false);

    const loadVideos = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, any> = {
                page,
                size: pageSize,
                hasVideo: true, // Only fetch orders with videos
            };

            if (search) params.search = search;
            if (platform !== "ALL") params.platform = platform;
            if (startDate) params.startDate = `${startDate}T00:00:00`;
            if (endDate) params.endDate = `${endDate}T23:59:59`;

            const res = await api.get<PageResponse<Order>>("/orders", { params });
            setOrders(res.data.content);
            setTotalPages(res.data.page.totalPages);
            setTotalElements(res.data.page.totalElements);
        } catch (err) {
            toast.error("Lỗi tải danh sách video");
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, search, platform, startDate, endDate]);

    useEffect(() => {
        loadVideos();
    }, [loadVideos]);

    const openPlayer = (url: string | null | undefined, trackingCode: string, type: string) => {
        if (!url) {
            toast.error("Không tìm thấy URL video");
            return;
        }
        setSelectedVideo({ url, title: `Video ${type}: ${trackingCode}` });
        setPlayerOpen(true);
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Video className="h-6 w-6 text-blue-600" />
                        Quản lý Video Chứng cứ
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Danh sách đơn hàng đã được ghi hình khi đóng gói hoặc kiểm hoàn.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Badge variant="outline" className="h-8 px-3">
                        Tổng số: {totalElements} video
                    </Badge>
                </div>
            </div>

            {/* Filters */}
            <Card className="border-0 shadow-sm">
                <CardContent className="p-4 md:p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground ml-1">Tìm mã vận đơn / Tên KH</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Mã vận đơn..."
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                                    className="pl-9 h-10"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground ml-1">Sàn vận hàng</label>
                            <Select value={platform} onValueChange={(v) => { setPlatform(v); setPage(0); }}>
                                <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Tất cả sàn" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Tất cả sàn</SelectItem>
                                    <SelectItem value="Shopee">Shopee</SelectItem>
                                    <SelectItem value="Lazada">Lazada</SelectItem>
                                    <SelectItem value="TikTok">TikTok</SelectItem>
                                    <SelectItem value="Other">Khác</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground ml-1">Từ ngày</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
                                    className="pl-9 h-10"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground ml-1">Đến ngày</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
                                    className="pl-9 h-10"
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Video Table */}
            <Card className="border-0 shadow-lg overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="w-[180px]">Mã vận đơn</TableHead>
                            <TableHead>Sàn</TableHead>
                            <TableHead>Khách hàng</TableHead>
                            {/* <TableHead>Thời gian ghi</TableHead> */}
                            <TableHead className="text-center">Video Đóng gói</TableHead>
                            <TableHead className="text-center">Video Kiểm hoàn</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-64 text-center">
                                    <div className="flex flex-col items-center justify-center gap-3">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                        <p className="text-muted-foreground">Đang tải danh sách video...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : orders.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-64 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <Video className="h-12 w-12 text-muted-foreground/30" />
                                        <p className="text-muted-foreground">Không tìm thấy video nào theo bộ lọc</p>
                                        <Button variant="ghost" onClick={() => { setSearch(""); setPlatform("ALL"); setStartDate(""); setEndDate(""); }} className="mt-2">
                                            Xóa bộ lọc
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            orders.map((order) => (
                                <TableRow key={order.id} className="group hover:bg-muted/30 transition-colors">
                                    <TableCell className="font-mono font-bold text-blue-600">
                                        {order.trackingCode}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="bg-blue-50/50 text-blue-700 border-blue-100">
                                            {order.platform}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="max-w-[150px] truncate">
                                            <p className="font-medium text-sm">{order.customerName || "—"}</p>
                                            <p className="text-xs text-muted-foreground">{order.customerPhone || "—"}</p>
                                        </div>
                                    </TableCell>
                                    {/* <TableCell>
                                        <div className="text-xs">
                                            <p>{order.updatedAt ? new Date(order.updatedAt).toLocaleDateString("vi-VN") : "—"}</p>
                                            <p className="text-muted-foreground">{order.updatedAt ? new Date(order.updatedAt).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' }) : ""}</p>
                                        </div>
                                    </TableCell> */}
                                    <TableCell className="text-center">
                                        {order.packVideoUrl ? (
                                            <div className="flex flex-col items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-primary hover:text-primary hover:bg-primary/10 gap-2"
                                                    onClick={() => openPlayer(order.packVideoUrl, order.trackingCode, "đóng gói")}
                                                >
                                                    <PlayCircle className="h-4 w-4" /> Xem
                                                </Button>
                                                {order.packVideoFraudDetected && (
                                                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-0.5" title={order.packVideoFraudMessages?.join("\n")}>
                                                        <AlertTriangle className="h-3 w-3" /> Gian lận
                                                    </Badge>
                                                )}
                                                {order.packVideoFraudAnalyzedAt == null && (
                                                    <span className="text-[10px] text-muted-foreground">Đang phân tích...</span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted-foreground italic">Không có</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {order.returnVideoUrl ? (
                                            <div className="flex flex-col items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-2"
                                                    onClick={() => openPlayer(order.returnVideoUrl, order.trackingCode, "kiểm hoàn")}
                                                >
                                                    <PlayCircle className="h-4 w-4" /> Xem
                                                </Button>
                                                {order.returnVideoFraudDetected && (
                                                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-0.5" title={order.returnVideoFraudMessages?.join("\n")}>
                                                        <AlertTriangle className="h-3 w-3" /> Gian lận
                                                    </Badge>
                                                )}
                                                {order.returnVideoFraudAnalyzedAt == null && (
                                                    <span className="text-[10px] text-muted-foreground">Đang phân tích...</span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted-foreground italic">Không có</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                {/* Pagination */}
                <div className="p-4 border-t bg-muted/20 flex flex-col sm:row items-center justify-between gap-4">
                    <p className="text-sm text-muted-foreground">
                        Hiển thị <b>{orders.length}</b>/{totalElements} đơn hàng có video
                    </p>
                    <div className="flex items-center gap-2">
                        <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(parseInt(v)); setPage(0); }}>
                            <SelectTrigger className="h-8 w-16">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="20">20</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                            </SelectContent>
                        </Select>
                        <div className="flex items-center gap-1 border rounded-md p-1 bg-background">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                                disabled={page === 0}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-xs w-16 text-center">Trang {page + 1}/{totalPages || 1}</span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                disabled={page >= totalPages - 1}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Video Player Modal */}
            <Dialog open={playerOpen} onOpenChange={setPlayerOpen}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95">
                    <DialogHeader className="p-4 bg-white/10 text-white backdrop-blur">
                        <DialogTitle className="flex items-center gap-2">
                            <Video className="h-5 w-5" />
                            {selectedVideo?.title}
                        </DialogTitle>
                    </DialogHeader>
                    {selectedVideo && (
                        <div className="aspect-video relative group">
                            <video
                                key={selectedVideo.url}
                                src={selectedVideo.url}
                                controls
                                autoPlay
                                className="h-full w-full object-contain shadow-2xl"
                            />
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <a
                                    href={selectedVideo.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-white/20 hover:bg-white/40 p-2 rounded-full backdrop-blur transition-colors inline-block"
                                    title="Mở trong tab mới"
                                >
                                    <ExternalLink className="h-5 w-5 text-white" />
                                </a>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
