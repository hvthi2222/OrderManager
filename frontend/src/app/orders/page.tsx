"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Order, OrderStatus, ReturnEvaluation, PageResponse } from "@/types";
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
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
    Search, Plus, Upload, ChevronLeft, ChevronRight, Trash2,
    Package, PackageCheck, RotateCcw, Video, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_LABELS: Record<OrderStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    PENDING: { label: "Chờ gửi", variant: "outline" },
    PACKED: { label: "Đã đóng gói", variant: "secondary" }, // Legacy
    COMPLETED: { label: "Đã đóng đơn", variant: "default" },
    CANCELLED: { label: "Đã xử lý (Hoàn)", variant: "destructive" },
    RETURNED: { label: "Đang hoàn", variant: "destructive" },
    RETURN_CHECKED: { label: "Đã kiểm hoàn", variant: "secondary" }, // Legacy
};

const EVAL_MAP: Record<ReturnEvaluation, { label: string; className: string }> = {
    NORMAL: { label: "Bình thường", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
    SUSPICIOUS_LOST: { label: "Nghi mất", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
    SUSPICIOUS_SWAPPED: { label: "Nghi tráo", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
};

// Group statuses for each tab
const SHIPPING_STATUSES: OrderStatus[] = ["PENDING", "PACKED", "COMPLETED"];
const RETURN_STATUSES: OrderStatus[] = ["CANCELLED", "RETURNED", "RETURN_CHECKED"];

type TabType = "shipping" | "returns";

export default function OrdersPage() {
    const { isAdmin } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>("shipping");
    const [orders, setOrders] = useState<Order[]>([]);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<string>("ALL");
    const [loading, setLoading] = useState(true);
    const [sort, setSort] = useState<"createdAt_desc" | "createdAt_asc" | "orderDate_desc" | "orderDate_asc" | "predictionRisk_desc">("createdAt_desc");

    // Detail dialog
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);

    // Create dialog
    const [createOpen, setCreateOpen] = useState(false);
    const [form, setForm] = useState({
        trackingCode: "",
        customerName: "",
        customerPhone: "",
        productInfo: "",
        platform: "Shopee",
    });

    // Import dialog
    const [importOpen, setImportOpen] = useState(false);

    const loadOrders = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { page, size: pageSize };
            if (search) params.search = search;

            // Apply status filter
            if (status !== "ALL") {
                params.status = status;
            } else {
                // When "ALL" in a tab, filter by the tab's statuses
                // Backend needs multiple statuses — we send comma-separated
                const tabStatuses = activeTab === "shipping" ? SHIPPING_STATUSES : RETURN_STATUSES;
                params.status = tabStatuses.join(",");
            }

            // Sort (server-side for normal fields)
            switch (sort) {
                case "createdAt_asc":
                    params.sortBy = "createdAt";
                    params.sortDir = "asc";
                    break;
                case "orderDate_desc":
                    params.sortBy = "orderDate";
                    params.sortDir = "desc";
                    break;
                case "orderDate_asc":
                    params.sortBy = "orderDate";
                    params.sortDir = "asc";
                    break;
                // predictionRisk is only in DTO, không phải field trong entity -> sort client-side
                default:
                    params.sortBy = "createdAt";
                    params.sortDir = "desc";
            }

            const res = await api.get<PageResponse<Order>>("/orders", { params });

            let content = res.data.content;
            if (sort === "predictionRisk_desc") {
                content = [...content].sort((a, b) => {
                    const av = a.predictionRisk ?? -1;
                    const bv = b.predictionRisk ?? -1;
                    return bv - av;
                });
            }

            setOrders(content);
            setTotalPages(res.data.page.totalPages);
            setTotalElements(res.data.page.totalElements);
        } catch (err) {
            toast.error("Lỗi tải danh sách đơn hàng");
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, search, status, activeTab, sort]);

    useEffect(() => { loadOrders(); }, [loadOrders]);

    const handleTabChange = (tab: string) => {
        setActiveTab(tab as TabType);
        setPage(0);
        setStatus("ALL");
        setSearch("");
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post("/orders", form);
            toast.success("Đã tạo đơn hàng");
            setCreateOpen(false);
            setForm({ trackingCode: "", customerName: "", customerPhone: "", productInfo: "", platform: "Shopee" });
            loadOrders();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Lỗi tạo đơn hàng");
        }
    };

    const handleImport = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        formData.append("platform", form.platform);
        try {
            const res = await api.post("/orders/import", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            toast.success(`Import thành công: ${res.data.successCount}/${res.data.totalRecords} đơn`);
            if (res.data.skipCount > 0) {
                toast.info(`Bỏ qua ${res.data.skipCount} đơn trùng`);
            }
            if (res.data.errors?.length > 0) {
                toast.warning(`${res.data.errorCount} lỗi: ${res.data.errors[0]}`);
            }
            setImportOpen(false);
            loadOrders();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Lỗi import");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Bạn có chắc muốn xóa đơn hàng này?")) return;
        try {
            await api.delete(`/orders/${id}`);
            toast.success("Đã xóa đơn hàng");
            loadOrders();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Lỗi xóa");
        }
    };

    const currentStatuses = activeTab === "shipping" ? SHIPPING_STATUSES : RETURN_STATUSES;
    const isReturnTab = activeTab === "returns";

    const getRiskInfo = (risk: number | null | undefined) => {
        if (risk === null || risk === undefined) return null;
        if (risk < 15) return { label: "Thấp", color: "bg-green-100 text-green-700 border-green-200" };
        if (risk < 30) return { label: "Vừa", color: "bg-yellow-100 text-yellow-700 border-yellow-200" };
        return { label: "CAO", color: "bg-red-100 text-red-700 border-red-200 font-bold" };
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Đơn hàng</h1>
                    <p className="text-muted-foreground">{totalElements} đơn hàng</p>
                </div>
                <div className="flex gap-2">
                    {isAdmin && (
                        <Dialog open={importOpen} onOpenChange={setImportOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <Upload className="mr-2 h-4 w-4" /> Import
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Import đơn hàng từ file</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleImport} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>File (Excel hoặc CSV)</Label>
                                        <Input name="file" type="file" accept=".xlsx,.xls,.csv" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Sàn TMĐT</Label>
                                        <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Shopee">Shopee</SelectItem>
                                                <SelectItem value="Lazada">Lazada</SelectItem>
                                                <SelectItem value="TikTok Shop">TikTok Shop</SelectItem>
                                                <SelectItem value="Tiki">Tiki</SelectItem>
                                                <SelectItem value="Sendo">Sendo</SelectItem>
                                                <SelectItem value="Khác">Khác</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button type="submit" className="w-full">Import</Button>
                                </form>
                            </DialogContent>
                        </Dialog>
                    )}

                    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm">
                                <Plus className="mr-2 h-4 w-4" /> Thêm đơn
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Thêm đơn hàng mới</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Mã vận đơn *</Label>
                                    <Input
                                        value={form.trackingCode}
                                        onChange={(e) => setForm({ ...form, trackingCode: e.target.value })}
                                        placeholder="VD: SPXVN..."
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Tên KH</Label>
                                        <Input
                                            value={form.customerName}
                                            onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>SĐT</Label>
                                        <Input
                                            value={form.customerPhone}
                                            onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Sản phẩm</Label>
                                    <Input
                                        value={form.productInfo}
                                        onChange={(e) => setForm({ ...form, productInfo: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Sàn TMĐT</Label>
                                    <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Shopee">Shopee</SelectItem>
                                            <SelectItem value="Lazada">Lazada</SelectItem>
                                            <SelectItem value="TikTok Shop">TikTok Shop</SelectItem>
                                            <SelectItem value="Tiki">Tiki</SelectItem>
                                            <SelectItem value="Sendo">Sendo</SelectItem>
                                            <SelectItem value="Khác">Khác</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button type="submit" className="w-full">Tạo đơn hàng</Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Order Detail Dialog */}
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            Chi tiết đơn hàng
                            {selectedOrder && (
                                <Badge variant={STATUS_LABELS[selectedOrder.status].variant}>
                                    {STATUS_LABELS[selectedOrder.status].label}
                                </Badge>
                            )}
                        </DialogTitle>
                    </DialogHeader>

                    {selectedOrder && (
                        <div className="space-y-6 py-4">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="space-y-1">
                                    <p className="text-muted-foreground">Mã vận đơn</p>
                                    <p className="font-mono font-bold text-base">{selectedOrder.trackingCode}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-muted-foreground">Mã đơn sàn</p>
                                    <p className="font-medium">{selectedOrder.shopOrderCode || "—"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-muted-foreground">Khách hàng</p>
                                    <p className="font-medium">{selectedOrder.customerName || "—"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-muted-foreground">Số điện thoại</p>
                                    <p className="font-medium">{selectedOrder.customerPhone || "—"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-muted-foreground">Sàn TMĐT</p>
                                    <p className="font-medium">{selectedOrder.platform}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-muted-foreground">Đơn vị vận chuyển</p>
                                    <p className="font-medium">{selectedOrder.shippingCarrier || "—"}</p>
                                </div>
                                {isAdmin && selectedOrder.predictionRisk !== null && (
                                    <div className="space-y-1">
                                        <p className="text-muted-foreground">Dự đoán rủi ro AI</p>
                                        <Badge variant="outline" className={getRiskInfo(selectedOrder.predictionRisk)?.color}>
                                            {getRiskInfo(selectedOrder.predictionRisk)?.label} ({selectedOrder.predictionRisk?.toFixed(0)}%)
                                        </Badge>
                                    </div>
                                )}
                            </div>

                            <hr />

                            {/* Status & Dates */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="space-y-1">
                                    <p className="text-muted-foreground">Ngày đặt hàng</p>
                                    <p className="font-medium">
                                        {selectedOrder.orderDate ? new Date(selectedOrder.orderDate).toLocaleString("vi-VN") : "—"}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-muted-foreground">Ngày tạo hệ thống</p>
                                    <p className="font-medium">
                                        {new Date(selectedOrder.createdAt).toLocaleString("vi-VN")}
                                    </p>
                                </div>
                                {selectedOrder.packedAt && (
                                    <div className="space-y-1">
                                        <p className="text-muted-foreground">Thời gian xử lý</p>
                                        <p className="font-medium">
                                            {new Date(selectedOrder.packedAt).toLocaleString("vi-VN")}
                                            {selectedOrder.packedByName && ` (Bởi ${selectedOrder.packedByName})`}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Items List */}
                            {selectedOrder.items && selectedOrder.items.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-sm">Danh sách sản phẩm</h4>
                                    <div className="border rounded-md divide-y text-sm">
                                        {selectedOrder.items.map((item, idx) => (
                                            <div key={idx} className="p-3 flex justify-between items-center">
                                                <div>
                                                    <p className="font-medium">{item.productName}</p>
                                                    {item.variantName && <p className="text-xs text-muted-foreground">{item.variantName}</p>}
                                                </div>
                                                <Badge variant="outline">x{item.quantity}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Specific Info */}
                            <div className="space-y-4 pt-2">
                                {selectedOrder.note && (
                                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-sm">
                                        <p className="font-bold text-blue-800 dark:text-blue-300 mb-1">Ghi chú KH:</p>
                                        <p>{selectedOrder.note}</p>
                                    </div>
                                )}
                                {selectedOrder.cancelReason && (
                                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm border border-red-100 dark:border-red-800">
                                        <p className="font-bold text-red-800 dark:text-red-300 mb-1">Lý do hủy:</p>
                                        <p>{selectedOrder.cancelReason}</p>
                                    </div>
                                )}
                                {selectedOrder.returnNote && (
                                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-sm border border-amber-100 dark:border-amber-800">
                                        <p className="font-bold text-amber-800 dark:text-amber-300 mb-1">Ghi chú kiểm hoàn:</p>
                                        <p>{selectedOrder.returnNote}</p>
                                    </div>
                                )}
                            </div>

                            {/* Videos */}
                            <div className="grid grid-cols-2 gap-4">
                                {selectedOrder.packVideoUrl && (
                                    <Button variant="outline" className="gap-2" asChild>
                                        <a href={selectedOrder.packVideoUrl} target="_blank" rel="noopener noreferrer">
                                            <Video className="h-4 w-4" /> Video đóng gói
                                        </a>
                                    </Button>
                                )}
                                {selectedOrder.returnVideoUrl && (
                                    <Button variant="outline" className="gap-2" asChild>
                                        <a href={selectedOrder.returnVideoUrl} target="_blank" rel="noopener noreferrer">
                                            <RotateCcw className="h-4 w-4" /> Video kiểm hoàn
                                        </a>
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Tabs: Đơn gửi / Đơn hoàn */}
            <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList className="grid w-full grid-cols-2 max-w-md">
                    <TabsTrigger value="shipping" className="flex items-center gap-2">
                        <PackageCheck className="h-4 w-4" /> Đơn gửi
                    </TabsTrigger>
                    <TabsTrigger value="returns" className="flex items-center gap-2">
                        <RotateCcw className="h-4 w-4" /> Đơn hoàn
                    </TabsTrigger>
                </TabsList>

                {/* Shared content for both tabs */}
                <div className="mt-4 space-y-4">
                    {/* Filters */}
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        placeholder="Tìm theo mã vận đơn, tên KH..."
                                        value={search}
                                        onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                                        className="pl-9"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
                                        <SelectTrigger className="w-[150px]">
                                            <SelectValue placeholder="Trạng thái" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">Tất cả</SelectItem>
                                            {currentStatuses.map((s) => (
                                                <SelectItem key={s} value={s}>{STATUS_LABELS[s].label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select
                                        value={sort}
                                        onValueChange={(v) => { setSort(v as typeof sort); setPage(0); }}
                                    >
                                        <SelectTrigger className="w-[170px]">
                                            <SelectValue placeholder="Sắp xếp" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="createdAt_desc">Mới tạo nhất</SelectItem>
                                            <SelectItem value="createdAt_asc">Cũ nhất</SelectItem>
                                            <SelectItem value="orderDate_desc">Ngày đặt mới nhất</SelectItem>
                                            <SelectItem value="orderDate_asc">Ngày đặt cũ nhất</SelectItem>
                                            <SelectItem value="predictionRisk_desc">Rủi ro cao trước</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Table */}
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Mã vận đơn</TableHead>
                                        <TableHead>Khách hàng</TableHead>
                                        <TableHead>Sàn</TableHead>
                                        {isAdmin && <TableHead>Rủi ro AI</TableHead>}
                                        <TableHead>Trạng thái</TableHead>
                                        {isReturnTab && (
                                            <>
                                                <TableHead>Lý do hủy</TableHead>
                                                <TableHead>Đánh giá hoàn</TableHead>
                                            </>
                                        )}
                                        {!isReturnTab && <TableHead>Người đóng</TableHead>}
                                        <TableHead>Sản phẩm</TableHead>
                                        <TableHead>Video</TableHead>
                                        <TableHead>Ngày tạo</TableHead>
                                        <TableHead className="text-right">Thao tác</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="text-center h-32">
                                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
                                            </TableCell>
                                        </TableRow>
                                    ) : orders.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="text-center h-32 text-muted-foreground">
                                                <Package className="h-10 w-10 mx-auto mb-2 opacity-40" />
                                                {isReturnTab ? "Chưa có đơn hoàn nào" : "Chưa có đơn gửi nào"}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        orders.map((order) => (
                                            <TableRow
                                                key={order.id}
                                                className="cursor-pointer hover:bg-muted/50 transition-colors"
                                                onClick={() => {
                                                    setSelectedOrder(order);
                                                    setDetailOpen(true);
                                                }}
                                            >
                                                <TableCell className="font-medium whitespace-nowrap">
                                                    {order.trackingCode}
                                                </TableCell>
                                                <TableCell>{order.customerName || "—"}</TableCell>
                                                <TableCell>{order.platform}</TableCell>
                                                {isAdmin && (
                                                    <TableCell>
                                                        {order.predictionRisk !== null ? (
                                                            <Badge variant="outline" className={`px-2 py-0 text-[10px] ${getRiskInfo(order.predictionRisk)?.color}`}>
                                                                {order.predictionRisk?.toFixed(0)}%
                                                            </Badge>
                                                        ) : "—"}
                                                    </TableCell>
                                                )}
                                                <TableCell>
                                                    <Badge variant={STATUS_LABELS[order.status].variant}>
                                                        {STATUS_LABELS[order.status].label}
                                                    </Badge>
                                                </TableCell>
                                                {isReturnTab && (
                                                    <>
                                                        <TableCell className="max-w-[150px] truncate text-xs text-muted-foreground" title={order.cancelReason || undefined}>
                                                            {order.cancelReason || "—"}
                                                        </TableCell>
                                                        <TableCell>
                                                            {order.returnEvaluation ? (
                                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${EVAL_MAP[order.returnEvaluation].className}`}>
                                                                    {EVAL_MAP[order.returnEvaluation].label}
                                                                </span>
                                                            ) : "—"}
                                                        </TableCell>
                                                    </>
                                                )}
                                                {!isReturnTab && (
                                                    <TableCell className="text-sm">
                                                        {order.packedByName || "—"}
                                                    </TableCell>
                                                )}
                                                <TableCell className="max-w-[200px] truncate" title={order.productInfo || undefined}>
                                                    {order.productInfo}
                                                    {order.items && order.items.length > 0 && (
                                                        <p className="text-xs text-muted-foreground">{order.items.length} sản phẩm</p>
                                                    )}
                                                </TableCell>
                                                <TableCell onClick={(e) => e.stopPropagation()}>
                                                    {(() => {
                                                        const videoUrl = isReturnTab ? order.returnVideoUrl : order.packVideoUrl;
                                                        return videoUrl ? (
                                                            <a
                                                                href={videoUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs"
                                                            >
                                                                <Video className="h-4 w-4" />
                                                                <ExternalLink className="h-3 w-3" />
                                                            </a>
                                                        ) : (
                                                            <span className="text-muted-foreground text-xs">—</span>
                                                        );
                                                    })()}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                                    {new Date(order.createdAt).toLocaleDateString("vi-VN")}
                                                </TableCell>
                                                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                    {isAdmin && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDelete(order.id)}
                                                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>

                            {/* Pagination */}
                            <div className="flex items-center justify-between px-4 py-3 border-t">
                                <div className="flex items-center gap-4">
                                    <p className="text-sm text-muted-foreground">
                                        Trang {page + 1} / {totalPages} ({totalElements} đơn)
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">Hiển thị:</span>
                                        <Select
                                            value={pageSize.toString()}
                                            onValueChange={(v) => { setPageSize(Number(v)); setPage(0); }}
                                        >
                                            <SelectTrigger className="h-8 w-[70px] text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {[10, 20, 50, 100].map(s => (
                                                    <SelectItem key={s} value={s.toString()}>{s}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                {totalPages > 1 && (
                                    <div className="flex gap-1">
                                        <Button variant="outline" size="icon" disabled={page === 0} onClick={() => setPage(page - 1)} className="h-8 w-8">
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button variant="outline" size="icon" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="h-8 w-8">
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </Tabs>
        </div>
    );
}
