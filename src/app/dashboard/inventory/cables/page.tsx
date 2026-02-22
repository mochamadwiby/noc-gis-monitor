"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { CablePath } from "@/components/dashboard/maps/AdminMapView";
import { CableDrawer } from "@/components/dashboard/forms/CableDrawer";
import { CableCoresForm } from "@/components/dashboard/forms/CableCoresForm";

export default function CablesInventoryPage() {
    const { data: session } = useSession();
    const canEdit = session?.user?.role === "ADMIN" || session?.user?.role === "DRAFTER";

    const [cables, setCables] = useState<CablePath[]>([]);
    const [isFetching, setIsFetching] = useState(true);

    const [isCableDrawerOpen, setIsCableDrawerOpen] = useState(false);
    const [isCoresFormOpen, setIsCoresFormOpen] = useState(false);
    const [selectedCable, setSelectedCable] = useState<CablePath | null>(null);

    const fetchCables = useCallback(async () => {
        setIsFetching(true);
        try {
            const res = await fetch("/api/cables");
            if (res.ok) {
                setCables(await res.json());
            }
        } catch (error) {
            console.error("Gagal mengambil data kabel", error);
        } finally {
            setIsFetching(false);
        }
    }, []);

    useEffect(() => {
        fetchCables();
    }, [fetchCables]);

    const handleEditCable = (cable: CablePath) => {
        setSelectedCable(cable);
        setIsCableDrawerOpen(true);
    };

    const handleManageCores = (cable: CablePath) => {
        setSelectedCable(cable);
        setIsCoresFormOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this cable segment?")) return;

        try {
            const res = await fetch(`/api/cables?id=${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete cable");

            setCables(cables.filter(c => c.id !== id));
        } catch (error) {
            console.error(error);
            alert("Error deleting cable");
        }
    };

    return (
        <div className="h-full flex flex-col gap-4">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Cables Inventory</h1>
                    <p className="text-sm text-muted-foreground">
                        Comprehensive list of all optical fiber lines.
                    </p>
                </div>
                <div className="bg-card px-4 py-2 rounded-lg border border-border shadow-sm font-mono text-sm">
                    Total Cables: {isFetching ? "..." : cables.length}
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-muted-foreground">
                        <thead className="text-xs text-foreground uppercase bg-muted/50 border-b border-border">
                            <tr>
                                <th scope="col" className="px-6 py-3">Code / Name</th>
                                <th scope="col" className="px-6 py-3">Type</th>
                                <th scope="col" className="px-6 py-3">Core Capacity</th>
                                <th scope="col" className="px-6 py-3">Path Nodes</th>
                                {canEdit && <th scope="col" className="px-6 py-3 text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {isFetching ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center bg-background/50 text-muted-foreground animate-pulse">
                                        Loading inventory...
                                    </td>
                                </tr>
                            ) : cables.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center bg-background/50 text-muted-foreground">
                                        No cables configured yet.
                                    </td>
                                </tr>
                            ) : (
                                cables.map((cable) => (
                                    <tr key={cable.id} className="bg-card border-b border-border hover:bg-muted/20 transition-colors">
                                        <td className="px-6 py-4 font-medium text-foreground whitespace-nowrap">
                                            {cable.name}
                                        </td>
                                        <td className="px-6 py-4 font-semibold">
                                            <span className={`px-2 py-1 rounded-md text-xs border ${cable.type === 'BACKBONE' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                cable.type === 'DISTRIBUTION' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                    'bg-green-500/10 text-green-500 border-green-500/20'
                                                }`}>
                                                {cable.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {cable.capacity} Cores
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs">
                                            {cable.path.length} Spans
                                        </td>
                                        {canEdit && (
                                            <td className="px-6 py-4 text-right space-x-3">
                                                <button
                                                    onClick={() => handleManageCores(cable)}
                                                    className="font-medium text-emerald-500 hover:underline"
                                                >
                                                    Cores
                                                </button>
                                                <button
                                                    onClick={() => handleEditCable(cable)}
                                                    className="font-medium text-primary hover:underline"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(cable.id)}
                                                    className="font-medium text-destructive hover:underline"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <CableDrawer
                isOpen={isCableDrawerOpen}
                onClose={() => setIsCableDrawerOpen(false)}
                cable={selectedCable}
                onSuccess={fetchCables}
                onManageCores={handleManageCores}
            />

            <CableCoresForm
                isOpen={isCoresFormOpen}
                onClose={() => setIsCoresFormOpen(false)}
                cable={selectedCable}
            />
        </div>
    );
}
