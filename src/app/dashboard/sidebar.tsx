"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

export default function Sidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();

    const navigation = [
        { name: "Overview", href: "/dashboard", icon: "📊" },
        { name: "GIS Map", href: "/dashboard/assets", icon: "🗺️" },
        { name: "SmartOLT Mirror", href: "/dashboard/smartolt", icon: "🌍" },
    ];

    const inventoryNavigation = [
        { name: "Assets Inventory", href: "/dashboard/inventory/assets", icon: "🏢" },
        { name: "Cables Inventory", href: "/dashboard/inventory/cables", icon: "🔌" },
    ];

    const adminNavigation = [
        { name: "Users", href: "/dashboard/users", icon: "👥", adminOnly: true }
    ];

    return (
        <div className="flex flex-col w-64 h-screen px-4 py-8 bg-card border-r border-border">
            <h2 className="text-xl font-semibold text-foreground">
                NOC Admin Panel
            </h2>

            <div className="mt-4 mb-8">
                <p className="text-sm font-medium text-muted-foreground">
                    Welcome, {session?.user?.name || session?.user?.email}
                </p>
                <p className="text-xs text-primary mt-1 capitalize border border-primary/20 bg-primary/10 px-2 py-1 rounded w-fit">
                    Role: {session?.user?.role || "GUEST"}
                </p>
            </div>

            <div className="flex flex-col justify-between flex-1 mt-2">
                <nav className="space-y-2">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/dashboard" && !pathname.includes("/inventory"));

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center px-4 py-2.5 text-sm font-medium transition-colors rounded-lg ${isActive
                                    ? "text-primary bg-primary/10"
                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                    }`}
                            >
                                <span className="mr-3">{item.icon}</span>
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="mt-8">
                    <h3 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Data Inventory
                    </h3>
                    <nav className="space-y-2">
                        {inventoryNavigation.map((item) => {
                            const isActive = pathname === item.href;

                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`flex items-center px-4 py-2.5 text-sm font-medium transition-colors rounded-lg ${isActive
                                        ? "text-primary bg-primary/10"
                                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                        }`}
                                >
                                    <span className="mr-3">{item.icon}</span>
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="mt-8">
                    <h3 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        System
                    </h3>
                    <nav className="space-y-2">
                        {adminNavigation.map((item) => {
                            if (item.adminOnly && session?.user?.role !== "ADMIN") return null;
                            const isActive = pathname === item.href;

                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`flex items-center px-4 py-2.5 text-sm font-medium transition-colors rounded-lg ${isActive
                                        ? "text-primary bg-primary/10"
                                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                        }`}
                                >
                                    <span className="mr-3">{item.icon}</span>
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="pb-4 mt-auto pt-8">
                    <Link
                        href="/"
                        className="flex items-center px-4 py-2.5 text-sm font-medium transition-colors rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground mb-2"
                    >
                        <span className="mr-3">🗺️</span>
                        Back to Public Map
                    </Link>

                    <button
                        onClick={() => signOut()}
                        className="flex items-center w-full px-4 py-2.5 text-sm font-medium text-destructive transition-colors rounded-lg hover:bg-destructive/10"
                    >
                        <span className="mr-3">🚪</span> Logout
                    </button>
                </div>
            </div>
        </div>
    );
}
