"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
    LayoutDashboard,
    Package,
    PackageCheck,
    RotateCcw,
    Video,
    BarChart3,
    Users,
    ScrollText,
    LogOut,
    Menu,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["ADMIN", "EMPLOYEE"] },
    { name: "Đơn hàng", href: "/orders", icon: Package, roles: ["ADMIN", "EMPLOYEE"] },
    { name: "Đóng đơn gửi", href: "/packing", icon: PackageCheck, roles: ["ADMIN", "EMPLOYEE"] },
    { name: "Xử lý đơn hoàn", href: "/returns", icon: RotateCcw, roles: ["ADMIN", "EMPLOYEE"] },
    { name: "Video", href: "/videos", icon: Video, roles: ["ADMIN", "EMPLOYEE"] },
    { name: "Báo cáo", href: "/reports", icon: BarChart3, roles: ["ADMIN"] },
    { name: "Người dùng", href: "/users", icon: Users, roles: ["ADMIN"] },
    { name: "Log hệ thống", href: "/logs", icon: ScrollText, roles: ["ADMIN"] },
];

export default function Sidebar() {
    const { user, logout, isAdmin } = useAuth();
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    const filteredNav = navigation.filter(
        (item) => item.roles.includes(user?.role || "EMPLOYEE")
    );

    const NavContent = () => (
        <div className="flex h-full flex-col">
            {/* Logo */}
            <div className="flex h-16 items-center gap-3 px-6">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                    OM
                </div>
                <div>
                    <h1 className="text-sm font-semibold">OrderManager</h1>
                    <p className="text-xs text-muted-foreground">Quản lý đơn hàng</p>
                </div>
            </div>

            <Separator />

            {/* Navigation */}
            <nav className="flex-1 space-y-1 px-3 py-4">
                {filteredNav.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                                isActive
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                        >
                            <item.icon className="h-4 w-4" />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            <Separator />

            {/* User Info */}
            <div className="p-4">
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-xs font-semibold bg-primary/10">
                            {user?.fullName?.charAt(0) || "U"}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user?.fullName}</p>
                        <p className="text-xs text-muted-foreground">
                            {isAdmin ? "Quản trị viên" : "Nhân viên"}
                        </p>
                    </div>
                    <ModeToggle />
                    <Button variant="ghost" size="icon" onClick={logout} title="Đăng xuất">
                        <LogOut className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile toggle */}
            <Button
                variant="ghost"
                size="icon"
                className="fixed top-3 left-3 z-50 lg:hidden"
                onClick={() => setMobileOpen(!mobileOpen)}
            >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-40 w-64 border-r bg-card transition-transform duration-200 lg:translate-x-0",
                    mobileOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <NavContent />
            </aside>
        </>
    );
}
