"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { AssetForm } from "@/components/dashboard/forms/AssetForm";
import { AssetNode } from "@/components/dashboard/maps/AdminMapView";

// Lazy load Map since Leaflet needs window object
const AdminMapView = dynamic(() => import("@/components/dashboard/maps/AdminMapView"), {
    ssr: false,
    loading: () => <div className="h-[500px] w-full bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl flex items-center justify-center">Loading Map...</div>
});

export default function AssetsPage() {
    const [assets, setAssets] = useState<AssetNode[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [newAssetCoords, setNewAssetCoords] = useState<{ lat: number, lng: number } | null>(null);
    const [isFetching, setIsFetching] = useState(true);

    const fetchAssets = useCallback(async () => {
        setIsFetching(true);
        try {
            // Fetch all assets in parallel
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

    const handleCreateRequest = (lat: number, lng: number) => {
        setNewAssetCoords({ lat, lng });
        setIsFormOpen(true);
    };

    return (
        <div className="h-full flex flex-col gap-4">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Physical Assets Management</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Click the Marker icon on the map tools (top right), then click anywhere on the map to add an OLT, ODF, OTB, ODC, or ODP.
                    </p>
                </div>
                <div className="text-sm text-gray-500 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg border dark:border-gray-700 font-mono">
                    Total Titik: {isFetching ? '...' : assets.length}
                </div>
            </div>

            <div className="flex-1 w-full min-h-[600px]">
                <AdminMapView
                    assets={assets}
                    onAssetCreated={handleCreateRequest}
                    drawMode="marker"
                />
            </div>

            {newAssetCoords && (
                <AssetForm
                    isOpen={isFormOpen}
                    onClose={() => setIsFormOpen(false)}
                    lat={newAssetCoords.lat}
                    lng={newAssetCoords.lng}
                    onSuccess={fetchAssets}
                />
            )}
        </div>
    );
}
