import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
    const userCount = await prisma.user.count();
    const odcCount = await prisma.odc.count();
    const odpCount = await prisma.odp.count();
    const cableCount = await prisma.cable.count();
    const onuCount = await prisma.smartOltOnu.count();

    const stats = [
        { name: "Total ODCs", stat: odcCount.toString(), icon: "🗄️" },
        { name: "Total ODPs", stat: odpCount.toString(), icon: "📡" },
        { name: "Cables Logged", stat: cableCount.toString(), icon: "🔌" },
        { name: "Synced ONUs", stat: onuCount.toString(), icon: "🌍" },
        { name: "System Users", stat: userCount.toString(), icon: "👥" },
    ];

    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Infrastructure Overview
            </h1>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {stats.map((item) => (
                    <div
                        key={item.name}
                        className="flex items-center p-6 bg-white border rounded-xl shadow-sm dark:bg-gray-800 dark:border-gray-700"
                    >
                        <div className="p-3 mr-4 text-blue-600 bg-blue-100 rounded-full dark:bg-blue-900/30 dark:text-blue-400 text-2xl">
                            {item.icon}
                        </div>
                        <div>
                            <p className="mb-1 text-sm font-medium text-gray-600 dark:text-gray-400">
                                {item.name}
                            </p>
                            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                                {item.stat}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-8 bg-white border rounded-xl shadow-sm dark:bg-gray-800 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Use the sidebar to navigate to specific management pages.
                </p>
                <div className="flex gap-4">
                    <a href="/dashboard/odc" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Add ODC</a>
                    <a href="/dashboard/odp" className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">Add ODP</a>
                </div>
            </div>
        </div>
    );
}
