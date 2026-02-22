import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Server, Route, Activity, Wifi, Users, Map } from "lucide-react";

export default async function DashboardPage() {
    const userCount = await prisma.user.count();
    const odcCount = await prisma.odc.count();
    const odpCount = await prisma.odp.count();
    const cableCount = await prisma.cable.count();
    const onuCount = await prisma.smartOltOnu.count();

    const stats = [
        {
            name: "ODC Terminals",
            stat: odcCount.toString(),
            icon: <Server className="w-6 h-6" />,
            color: "from-blue-500/20 to-cyan-500/20",
            textColor: "text-cyan-500"
        },
        {
            name: "ODP Distribution",
            stat: odpCount.toString(),
            icon: <Route className="w-6 h-6" />,
            color: "from-purple-500/20 to-pink-500/20",
            textColor: "text-pink-500"
        },
        {
            name: "Cable Infrastructure",
            stat: cableCount.toString(),
            icon: <Activity className="w-6 h-6" />,
            color: "from-amber-500/20 to-orange-500/20",
            textColor: "text-orange-500"
        },
        {
            name: "Active Customer ONUs",
            stat: onuCount.toString(),
            icon: <Wifi className="w-6 h-6" />,
            color: "from-emerald-500/20 to-green-500/20",
            textColor: "text-emerald-500"
        },
    ];

    return (
        <div className="flex flex-col gap-8 h-full">
            <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                    Network Overview
                </h1>
                <p className="text-muted-foreground mt-2">
                    Real-time statistics of your physical infrastructure and SmartOLT integration.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((item) => (
                    <Card
                        key={item.name}
                        className="relative overflow-hidden group border-border/50 bg-card/50 backdrop-blur-xl hover:bg-card/80 transition-all duration-500"
                    >
                        <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                        <div className="p-6 relative z-10">
                            <div className="flex justify-between items-start mb-6">
                                <div className={`p-3 rounded-xl bg-background/50 backdrop-blur-sm border border-border/50 shadow-inner ${item.textColor}`}>
                                    {item.icon}
                                </div>
                                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-background/50 border border-border/50 text-muted-foreground">
                                    LIVE
                                </span>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">
                                    {item.name}
                                </p>
                                <p className="text-4xl font-bold tracking-tight text-foreground font-mono">
                                    {item.stat}
                                </p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
                <Card className="lg:col-span-2 relative overflow-hidden p-8 border-border/50 bg-gradient-to-r from-blue-900/20 to-purple-900/20 backdrop-blur-xl">
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <Map className="w-6 h-6 text-blue-400" />
                                <h2 className="text-2xl font-bold text-foreground">Interactive Admin Map</h2>
                            </div>
                            <p className="text-muted-foreground max-w-lg mb-8">
                                Fully manage your physical network layout. Draw backbone cables, drop wires, plot OLTs, and monitor customer ONUs in real-time on a geographical layer.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-4">
                            <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25">
                                <Link href="/dashboard/assets">Manage Physical Assets</Link>
                            </Button>
                        </div>
                    </div>
                    {/* Decorative Background Elements */}
                    <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                    <div className="absolute right-10 bottom-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl translate-y-1/3"></div>
                </Card>

                <Card className="relative overflow-hidden p-8 border-border/50 bg-card/50 backdrop-blur-xl flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Users className="w-6 h-6 text-indigo-400" />
                            <h2 className="text-xl font-bold text-foreground">System Users</h2>
                        </div>
                        <p className="text-muted-foreground mb-6">
                            Manage dashboard access and user roles.
                        </p>
                        <div className="text-5xl font-bold font-mono text-foreground mb-4">
                            {userCount}
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
