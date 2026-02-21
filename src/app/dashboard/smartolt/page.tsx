import { prisma } from "@/lib/prisma";
import SyncButton from "./sync-button";
import { Card, CardHeader, Badge } from "@/components/dashboard/ui";

export const metadata = {
    title: "SmartOLT Mirror - NOC GIS Monitor",
};

export default async function SmartOltPage() {
    const onuCount = await prisma.smartOltOnu.count();
    const onlineCount = await prisma.smartOltOnu.count({
        where: { status: "Online" },
    });

    // Recent 10 syncs
    const recentOnus = await prisma.smartOltOnu.findMany({
        take: 10,
        orderBy: { updatedAt: "desc" },
    });

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                        SmartOLT Mirror
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Read-only local copy of SmartOLT customer data for GIS mapping.
                    </p>
                </div>
                <SyncButton />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Total Synced ONUs
                    </p>
                    <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                        {onuCount.toLocaleString('id-ID')}
                    </p>
                </Card>
                <Card>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Online Status
                    </p>
                    <div className="mt-2 flex items-baseline gap-2">
                        <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                            {onlineCount.toLocaleString('id-ID')}
                        </p>
                        <span className="text-sm text-gray-500 dark:text-gray-400">active</span>
                    </div>
                </Card>
            </div>

            <Card noPadding className="overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Recently Synced Records
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800/50 dark:text-gray-400 border-b dark:border-gray-700">
                            <tr>
                                <th scope="col" className="px-6 py-4 font-semibold tracking-wider">SN / Mac</th>
                                <th scope="col" className="px-6 py-4 font-semibold tracking-wider">Customer Name</th>
                                <th scope="col" className="px-6 py-4 font-semibold tracking-wider">Zone</th>
                                <th scope="col" className="px-6 py-4 font-semibold tracking-wider">Status</th>
                                <th scope="col" className="px-6 py-4 font-semibold tracking-wider">Signal</th>
                                <th scope="col" className="px-6 py-4 font-semibold tracking-wider">Last Sync</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {recentOnus.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <span className="text-4xl mb-3">📡</span>
                                            <p>No data synced yet. Click "Fetch SmartOLT Now" to populate DB.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                recentOnus.map((onu) => (
                                    <tr key={onu.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                            {onu.sn}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                            {onu.name}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                            {onu.zone_name || '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant={
                                                onu.status === 'Online' ? 'success' :
                                                    onu.status === 'LOS' ? 'danger' :
                                                        onu.status === 'Power fail' ? 'warning' : 'default'
                                            }>
                                                {onu.status || 'Unknown'}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                            {onu.signal ? <span className="font-mono">{onu.signal} dBm</span> : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-400">
                                            {new Date(onu.updatedAt).toLocaleString('id-ID')}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
