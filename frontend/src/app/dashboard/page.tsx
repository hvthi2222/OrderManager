"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ReportSummary, EmployeeStat, PlatformStat } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, PackageCheck, RotateCcw, Clock, TrendingUp, Users, XCircle } from "lucide-react";
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

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function DashboardPage() {
    const { user } = useAuth();
    const [summary, setSummary] = useState<ReportSummary | null>(null);
    const [employees, setEmployees] = useState<EmployeeStat[]>([]);
    const [platforms, setPlatforms] = useState<PlatformStat[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [summaryRes, employeesRes, platformsRes] = await Promise.all([
                api.get("/reports/summary"),
                api.get("/reports/employees"),
                api.get("/reports/platforms"),
            ]);
            setSummary(summaryRes.data);
            setEmployees(employeesRes.data);
            setPlatforms(platformsRes.data);
        } catch (err) {
            console.error("Failed to load dashboard data:", err);
        } finally {
            setLoading(false);
        }
    };

    const stats = [
        {
            title: "Chờ gửi",
            value: summary?.totalPending || 0,
            icon: Clock,
            color: "text-amber-600",
            bg: "bg-amber-50",
        },
        {
            title: "Đơn đã đóng",
            value: summary?.totalCompleted || 0,
            icon: PackageCheck,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
        },
        {
            title: "Đang hoàn",
            value: summary?.totalReturned || 0,
            icon: RotateCcw,
            color: "text-rose-600",
            bg: "bg-rose-50",
        },
        {
            title: "Đã xử lý",
            value: summary?.totalCancelled || 0,
            icon: XCircle,
            color: "text-red-600",
            bg: "bg-red-50",
        },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">
                    Xin chào, {user?.fullName} 👋
                </h1>
                <p className="text-muted-foreground">
                    Tổng quan đơn hàng hôm nay
                </p>
            </div>

            {/* Stats cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <Card key={stat.title} className="border-0 shadow-sm">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                                </div>
                                <div className={`${stat.bg} p-3 rounded-xl`}>
                                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-7">
                {/* Employee Performance */}
                <Card className="lg:col-span-4 border-0 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-medium flex items-center gap-2">
                            <Users className="h-4 w-4 text-primary" />
                            Hiệu suất nhân viên
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {employees.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={employees}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                    <XAxis dataKey="employeeName" fontSize={12} />
                                    <YAxis fontSize={12} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "hsl(var(--card))",
                                            border: "1px solid hsl(var(--border))",
                                            borderRadius: "8px",
                                        }}
                                    />
                                    <Bar dataKey="orderCount" name="Số đơn" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                                Chưa có dữ liệu
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Platform Distribution */}
                <Card className="lg:col-span-3 border-0 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-medium flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            Phân bổ theo sàn
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {platforms.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <PieChart>
                                    <Pie
                                        data={platforms}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        paddingAngle={3}
                                        dataKey="orderCount"
                                        nameKey="platform"
                                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                                    >
                                        {platforms.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                                Chưa có dữ liệu
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
