"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollText, Calendar, ChevronLeft, ChevronRight, Search, Eye, Filter, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { User } from "@/types";

interface AuditLog {
    id: number;
    action: string;
    target: string;
    details: Record<string, any> | null;
    ipAddress: string;
    createdAt: string;
    user: { id: number; username: string; fullName: string } | null;
}

const ACTION_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    LOGIN: { label: "Đăng nhập", variant: "secondary" },
    LOGOUT: { label: "Đăng xuất", variant: "outline" },
    CREATE_ORDER: { label: "Tạo đơn hàng", variant: "default" },
    UPDATE_ORDER: { label: "Cập nhật đơn", variant: "outline" },
    DELETE_ORDER: { label: "Xóa đơn hàng", variant: "destructive" },
    IMPORT_ORDERS: { label: "Import Excel", variant: "default" },
    CONFIRM_PACK: { label: "Đóng đơn", variant: "default" },
    CONFIRM_RETURN: { label: "Xử lý hoàn", variant: "secondary" },
    CHECK_ITEM: { label: "Kiểm hàng", variant: "outline" },
};

export default function LogsPage() {
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [users, setUsers] = useState<User[]>([]);

    // Filters
    const [startDate, setStartDate] = useState(weekAgo);
    const [endDate, setEndDate] = useState(today);
    const [search, setSearch] = useState("");
    const [selectedUserId, setSelectedUserId] = useState<string>("ALL");
    const [selectedAction, setSelectedAction] = useState<string>("ALL");

    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(true);

    // Detail Modal
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);

    const loadUsers = async () => {
        try {
            const res = await api.get("/users");
            setUsers(res.data);
        } catch (err) {
            console.error("Lỗi tải user", err);
        }
    };

    const loadLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {
                startDate,
                endDate,
                page,
                size: 30
            };

            if (search) params.search = search;
            if (selectedUserId !== "ALL") params.userId = selectedUserId;
            if (selectedAction !== "ALL") params.action = selectedAction;

            const res = await api.get("/logs", { params });
            setLogs(res.data.content);
            setTotalPages(res.data.page.totalPages);
        } catch (err) {
            toast.error("Lỗi tải log hệ thống");
        } finally {
            setLoading(false);
        }
    }, [page, startDate, endDate, search, selectedUserId, selectedAction]);

    useEffect(() => {
        loadUsers();
    }, []);

    useEffect(() => {
        loadLogs();
    }, [page, loadLogs]);

    const handleFilter = () => {
        setPage(0);
        loadLogs();
    };

    const showDetails = (log: AuditLog) => {
        setSelectedLog(log);
        setDetailOpen(true);
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <ScrollText className="h-6 w-6 text-primary" />
                        Log hệ thống
                    </h1>
                    <p className="text-muted-foreground">Theo dõi và đối soát mọi thao tác trong hệ thống</p>
                </div>
            </div>

            <Card className="border-0 shadow-sm overflow-visible">
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium flex items-center gap-1">
                                <Search className="h-3 w-3" /> Tìm mã vận đơn
                            </Label>
                            <Input
                                placeholder="Mã vận đơn..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="h-10"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium flex items-center gap-1">
                                <UserIcon className="h-3 w-3" /> Người dùng
                            </Label>
                            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Tất cả người dùng" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Tất cả người dùng</SelectItem>
                                    {users.map(u => (
                                        <SelectItem key={u.id} value={u.id.toString()}>{u.fullName}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium flex items-center gap-1">
                                <Filter className="h-3 w-3" /> Hành động
                            </Label>
                            <Select value={selectedAction} onValueChange={setSelectedAction}>
                                <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Tất cả hành động" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Tất cả hành động</SelectItem>
                                    {Object.entries(ACTION_MAP).map(([key, value]) => (
                                        <SelectItem key={key} value={key}>{value.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> Từ ngày
                            </Label>
                            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-10" />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> Đến ngày
                            </Label>
                            <div className="flex gap-2">
                                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-10 flex-1" />
                                <Button onClick={handleFilter} className="h-10 px-3 bg-blue-600 hover:bg-blue-700">
                                    Lọc
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-0 shadow-lg overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="w-[180px]">Thời gian</TableHead>
                            <TableHead>Người dùng</TableHead>
                            <TableHead>Hành động</TableHead>
                            <TableHead>Đối tượng</TableHead>
                            <TableHead>IP</TableHead>
                            <TableHead className="text-right">Chi tiết</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-64">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                                        <p className="text-sm text-muted-foreground">Đang tải dữ liệu log...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-64 text-muted-foreground">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <ScrollText className="h-12 w-12 text-muted-foreground/20" />
                                        <p>Không có dữ liệu log nào được tìm thấy</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map((log) => {
                                const actionInfo = ACTION_MAP[log.action] || { label: log.action, variant: "outline" };
                                return (
                                    <TableRow key={log.id} className="group hover:bg-muted/40 transition-colors">
                                        <TableCell className="text-xs font-medium text-slate-500">
                                            {new Date(log.createdAt).toLocaleString("vi-VN")}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-sm">{log.user?.fullName || "Hệ thống"}</span>
                                                <span className="text-[10px] text-muted-foreground uppercase">@{log.user?.username || "system"}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={actionInfo.variant} className="rounded-md font-medium px-2 py-0.5">
                                                {actionInfo.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-sm font-bold text-blue-600">
                                            {log.target || "—"}
                                        </TableCell>
                                        <TableCell className="text-xs font-mono text-muted-foreground">
                                            {log.ipAddress || "—"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-blue-600"
                                                onClick={() => showDetails(log)}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>

                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/20">
                        <p className="text-sm text-muted-foreground font-medium">
                            Trang <b>{page + 1}</b> trên <b>{totalPages}</b>
                        </p>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="h-8" disabled={page === 0} onClick={() => setPage(page - 1)}>
                                <ChevronLeft className="mr-1 h-4 w-4" /> Trước
                            </Button>
                            <Button variant="outline" size="sm" className="h-8" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                                Tiếp <ChevronRight className="ml-1 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* JSON Details Modal */}
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="max-w-xl max-h-[80vh] flex flex-col p-0 overflow-hidden">
                    <DialogHeader className="p-6 border-b">
                        <DialogTitle className="flex items-center gap-2">
                            <Eye className="h-5 w-5 text-blue-600" />
                            Chi tiết thao tác
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto p-6 bg-slate-50 dark:bg-slate-900">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="space-y-1">
                                    <p className="text-muted-foreground font-medium">Hành động</p>
                                    <p className="font-bold">{ACTION_MAP[selectedLog?.action || ""]?.label || selectedLog?.action}</p>
                                </div>
                                <div className="space-y-1 text-right">
                                    <p className="text-muted-foreground font-medium">Đối tượng</p>
                                    <p className="font-mono font-bold text-blue-600">{selectedLog?.target || "—"}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground font-medium">Dữ liệu chi tiết (JSON)</p>
                                <pre className="p-4 rounded-lg bg-slate-950 text-emerald-400 text-xs font-mono overflow-auto border border-slate-800 shadow-inner">
                                    {selectedLog?.details ? JSON.stringify(selectedLog.details, null, 2) : "// Không có dữ liệu chi tiết"}
                                </pre>
                            </div>

                            <div className="pt-4 border-t grid grid-cols-2 gap-4 text-[11px] text-muted-foreground">
                                <p>IP Address: {selectedLog?.ipAddress || "Unknown"}</p>
                                <p className="text-right">Ngày ghi: {selectedLog ? new Date(selectedLog.createdAt).toLocaleString("vi-VN") : ""}</p>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
