"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

export default function Sidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();

    const navigation = [
        { name: "Overview", href: "/dashboard", icon: "📊" },
        { name: "Physical Assets", href: "/dashboard/assets", icon: "🏢" },
        { name: "Cables Routing", href: "/dashboard/cables", icon: "🔌" },
        { name: "SmartOLT Mirror", href: "/dashboard/smartolt", icon: "🌍" },
        { name: "Users", href: "/dashboard/users", icon: "👥", adminOnly: true },
    ];

    return (
        <div className="flex flex-col w-64 h-screen px-4 py-8 bg-white border-r dark:bg-gray-900 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                NOC Admin Panel
            </h2>

            <div className="mt-4 mb-8">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Welcome, {session?.user?.name || session?.user?.email}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 capitalize border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/30 px-2 py-1 rounded w-fit">
                    Role: {session?.user?.role || "GUEST"}
                </p>
            </div>

            <div className="flex flex-col justify-between flex-1 mt-2">
                <nav className="space-y-2">
                    {navigation.map((item) => {
                        // Hide admin routes from non-admins
                        if (item.adminOnly && session?.user?.role !== "ADMIN") return null;

                        const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/dashboard");

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center px-4 py-2.5 text-sm font-medium transition-colors rounded-lg ${isActive
                                    ? "text-blue-700 bg-blue-50 dark:bg-blue-900/50 dark:text-blue-200"
                                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                                    }`}
                            >
                                <span className="mr-3">{item.icon}</span>
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="pb-4">
                    <Link
                        href="/"
                        className="flex items-center px-4 py-2.5 text-sm font-medium transition-colors rounded-lg text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 mb-2"
                    >
                        <span className="mr-3">🗺️</span>
                        Back to Public Map
                    </Link>

                    <button
                        onClick={() => signOut()}
                        className="flex items-center w-full px-4 py-2.5 text-sm font-medium text-red-600 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 dark:text-red-400"
                    >
                        <span className="mr-3">🚪</span> Logout
                    </button>
                </div>
            </div>
        </div>
    );
}
