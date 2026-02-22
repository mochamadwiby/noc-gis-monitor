"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { AssetDrawer } from "@/components/dashboard/forms/AssetDrawer";
import { AssetNode } from "@/components/dashboard/maps/AdminMapView";

export default function AssetsInventoryPage() {
    const { data: session } = useSession();
    const canEdit = session?.user?.role === "ADMIN" || session?.user?.role === "DRAFTER";

    const [assets, setAssets] = useState<AssetNode[]>([]);
    const [isFetching, setIsFetching] = useState(true);

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<AssetNode | null>(null);

    const fetchAssets = useCallback(async () => {
        setIsFetching(true);
        try {
            const [oltRes, odfRes, otbRes, odcRes, odpRes] = await Promise.all([
                fetch("/api/assets/olt"),
                fetch("/api/assets/odf"),
                fetch("/api/assets/otb"),
                fetch("/api/assets/odc"),
                fetch("/api/assets/odp")
            ]);

            const [olts, odfs, otbs, odcs, odps] = await Promise.all([
                oltRes.json(), odfRes.json(), otbRes.json(), odcRes.json(), odpRes.json()
            ]);

            const mappedAssets: AssetNode[] = [
                ...(olts.map((a: any) => ({ ...a, type: "OLT" }))),
                ...(odfs.map((a: any) => ({ ...a, type: "ODF" }))),
                ...(otbs.map((a: any) => ({ ...a, type: "OTB" }))),
                ...(odcs.map((a: any) => ({ ...a, type: "ODC" }))),
                ...(odps.map((a: any) => ({ ...a, type: "ODP" })))
            ];

            setAssets(mappedAssets);
        } catch (error) {
            console.error("Gagal mengambil data asset", error);
        } finally {
            setIsFetching(false);
        }
    }, []);

    useEffect(() => {
        fetchAssets();
    }, [fetchAssets]);

    const handleEdit = (asset: AssetNode) => {
        setSelectedAsset(asset);
        setIsDrawerOpen(true);
    };

    const handleDelete = async (type: string, id: string) => {
        if (!confirm("Are you sure you want to delete this asset?")) return;

        try {
            const res = await fetch(`/api/assets/${type.toLowerCase()}?id=${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete asset");

            // Refresh purely from local state for speed
            setAssets(assets.filter(a => a.id !== id));
        } catch (error) {
            console.error(error);
            alert("Error deleting asset");
        }
    };

    return (
        <div className="h-full flex flex-col gap-4">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Assets Inventory</h1>
                    <p className="text-sm text-muted-foreground">
                        Comprehensive list of all passive and active network assets.
                    </p>
                </div>
                <div className="bg-card px-4 py-2 rounded-lg border border-border shadow-sm font-mono text-sm">
                    Total Assets: {isFetching ? "..." : assets.length}
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-muted-foreground">
                        <thead className="text-xs text-foreground uppercase bg-muted/50 border-b border-border">
                            <tr>
                                <th scope="col" className="px-6 py-3">Type</th>
                                <th scope="col" className="px-6 py-3">Code / Name</th>
                                <th scope="col" className="px-6 py-3">Capacity</th>
                                <th scope="col" className="px-6 py-3">Location (Lat, Lng)</th>
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
                            ) : assets.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center bg-background/50 text-muted-foreground">
                                        No assets configured yet.
                                    </td>
                                </tr>
                            ) : (
                                assets.map((asset) => (
                                    <tr key={asset.id} className="bg-card border-b border-border hover:bg-muted/20 transition-colors">
                                        <td className="px-6 py-4 font-semibold">
                                            <span className="px-2 py-1 bg-primary/10 text-primary rounded-md text-xs border border-primary/20">
                                                {asset.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-foreground whitespace-nowrap">
                                            {asset.name}
                                        </td>
                                        <td className="px-6 py-4">
                                            {asset.type === "OLT" ? (asset.brand || "N/A") : (asset.capacity ? `${asset.capacity} Ports/Cores` : "N/A")}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs">
                                            {asset.latitude.toFixed(6)}, {asset.longitude.toFixed(6)}
                                        </td>
                                        {canEdit && (
                                            <td className="px-6 py-4 text-right space-x-3">
                                                <button
                                                    onClick={() => handleEdit(asset)}
                                                    className="font-medium text-primary hover:underline"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(asset.type, asset.id)}
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

            <AssetDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                asset={selectedAsset}
                onSuccess={fetchAssets}
            />
        </div>
    );
}
