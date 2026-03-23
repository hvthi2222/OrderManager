"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { ReportSummary, EmployeeStat, PlatformStat } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
} from "recharts";
import { BarChart3, Download, Calendar } from "lucide-react";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function ReportsPage() {
    const today = new Date().toISOString().split("T")[0];
    const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString()
        .split("T")[0];

    const [startDate, setStartDate] = useState(firstOfMonth);
    const [endDate, setEndDate] = useState(today);
    const [summary, setSummary] = useState<ReportSummary | null>(null);
    const [employees, setEmployees] = useState<EmployeeStat[]>([]);
    const [platforms, setPlatforms] = useState<PlatformStat[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        try {
            const params = { startDate, endDate };
            const [s, e, p] = await Promise.all([
                api.get("/reports/summary", { params }),
                api.get("/reports/employees", { params }),
                api.get("/reports/platforms", { params }),
            ]);
            setSummary(s.data);
            setEmployees(e.data);
            setPlatforms(p.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <BarChart3 className="h-6 w-6 text-primary" />
                        Báo cáo
                    </h1>
                    <p className="text-muted-foreground">Thống kê đơn hàng theo khoảng thời gian</p>
                </div>
            </div>

            {/* Date filter */}
            <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row items-end gap-3">
                        <div className="space-y-1.5 flex-1">
                            <Label className="text-xs">Từ ngày</Label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5 flex-1">
                            <Label className="text-xs">Đến ngày</Label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                        <Button onClick={loadData} className="h-9">
                            <Calendar className="mr-2 h-4 w-4" />
                            Xem báo cáo
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
            ) : (
                <>
                    {/* Summary cards */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {[
                            { label: "Chờ gửi", value: summary?.totalPending || 0, color: "text-amber-600" },
                            { label: "Đơn đã đóng", value: summary?.totalCompleted || 0, color: "text-emerald-600" },
                            { label: "Đang hoàn", value: summary?.totalReturned || 0, color: "text-rose-600" },
                            { label: "Đã xử lý", value: summary?.totalCancelled || 0, color: "text-red-600" },
                        ].map((s) => (
                            <Card key={s.label} className="border-0 shadow-sm">
                                <CardContent className="p-4 text-center">
                                    <p className="text-sm text-muted-foreground">{s.label}</p>
                                    <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Charts */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        <Card className="border-0 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">Nhân viên đóng đơn</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {employees.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={employees}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="employeeName" fontSize={12} />
                                            <YAxis fontSize={12} />
                                            <Tooltip />
                                            <Bar dataKey="orderCount" name="Số đơn" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <p className="text-center text-muted-foreground py-16">Chưa có dữ liệu</p>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">Phân bổ theo sàn TMĐT</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {platforms.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie
                                                data={platforms}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={50}
                                                outerRadius={90}
                                                paddingAngle={3}
                                                dataKey="orderCount"
                                                nameKey="platform"
                                                label
                                            >
                                                {platforms.map((_, i) => (
                                                    <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <p className="text-center text-muted-foreground py-16">Chưa có dữ liệu</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Employee table */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">Chi tiết nhân viên</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nhân viên</TableHead>
                                        <TableHead className="text-right">Số đơn</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {employees.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center text-muted-foreground h-20">
                                                Chưa có dữ liệu
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        employees.map((e) => (
                                            <TableRow key={e.employeeId}>
                                                <TableCell className="font-medium">{e.employeeName}</TableCell>
                                                <TableCell className="text-right">
                                                    <Badge variant="secondary">{e.orderCount}</Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
