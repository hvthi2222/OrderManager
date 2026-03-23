"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { Toaster } from "@/components/ui/sonner";

export default function AppShell({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!isLoading && !user && pathname !== "/login") {
            router.push("/login");
        }
    }, [user, isLoading, pathname, router]);

    // Show nothing while checking auth
    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    // Login page — no sidebar
    if (pathname === "/login") {
        return (
            <>
                {children}
                <Toaster richColors position="top-right" />
            </>
        );
    }

    // Not authenticated
    if (!user) return null;

    return (
        <div className="min-h-screen bg-background">
            <Sidebar />
            <main className="lg:pl-64">
                <div className="p-6 lg:p-8">{children}</div>
            </main>
            <Toaster richColors position="top-right" />
        </div>
    );
}
