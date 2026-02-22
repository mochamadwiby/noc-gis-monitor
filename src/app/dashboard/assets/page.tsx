"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { AssetForm } from "@/components/dashboard/forms/AssetForm";
import { AssetDrawer } from "@/components/dashboard/forms/AssetDrawer";
import { CableForm } from "@/components/dashboard/forms/CableForm";
import { CableDrawer } from "@/components/dashboard/forms/CableDrawer";
import { CableCoresForm } from "@/components/dashboard/forms/CableCoresForm";
import { AssetNode, CablePath } from "@/components/dashboard/maps/AdminMapView";

// Lazy load Map since Leaflet needs window object
const AdminMapView = dynamic(() => import("@/components/dashboard/maps/AdminMapView"), {
    ssr: false,
    loading: () => <div className="h-[500px] w-full bg-muted animate-pulse rounded-xl flex items-center justify-center text-muted-foreground">Loading Map...</div>
});

export default function AssetsPage() {
    const { data: session } = useSession();
    const canEdit = session?.user?.role === "ADMIN" || session?.user?.role === "DRAFTER";
    const [assets, setAssets] = useState<AssetNode[]>([]);
    const [cables, setCables] = useState<CablePath[]>([]);
    const [onus, setOnus] = useState<any[]>([]);

    // Asset States
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<AssetNode | null>(null);
    const [newAssetCoords, setNewAssetCoords] = useState<{ lat: number, lng: number } | null>(null);

    // Cable States
    const [isCableFormOpen, setIsCableFormOpen] = useState(false);
    const [isCableDrawerOpen, setIsCableDrawerOpen] = useState(false);
    const [isCoresFormOpen, setIsCoresFormOpen] = useState(false);
    const [selectedCable, setSelectedCable] = useState<CablePath | null>(null);
    const [newCablePath, setNewCablePath] = useState<[number, number][] | null>(null);

    const [isFetching, setIsFetching] = useState(true);

    const fetchAssets = useCallback(async () => {
        setIsFetching(true);
        try {
            // Fetch all assets and cables in parallel
            const [oltRes, odfRes, otbRes, odcRes, odpRes, cableRes, onuRes] = await Promise.all([
                fetch("/api/assets/olt"),
                fetch("/api/assets/odf"),
                fetch("/api/assets/otb"),
                fetch("/api/assets/odc"),
                fetch("/api/assets/odp"),
                fetch("/api/cables"),
                fetch("/api/onus")
            ]);

            const [olts, odfs, otbs, odcs, odps, cablesData, onuData] = await Promise.all([
                oltRes.json(), odfRes.json(), otbRes.json(), odcRes.json(), odpRes.json(), cableRes.json(), onuRes.json()
            ]);

            const mappedAssets: AssetNode[] = [
                ...(olts.map((a: any) => ({ ...a, type: "OLT" }))),
                ...(odfs.map((a: any) => ({ ...a, type: "ODF" }))),
                ...(otbs.map((a: any) => ({ ...a, type: "OTB" }))),
                ...(odcs.map((a: any) => ({ ...a, type: "ODC" }))),
                ...(odps.map((a: any) => ({ ...a, type: "ODP" })))
            ];

            setAssets(mappedAssets);
            setCables(cablesData);
            setOnus(onuData);
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

    const handleEditRequest = (asset: AssetNode) => {
        setSelectedAsset(asset);
        setIsDrawerOpen(true);
    };

    const handleCableCreateRequest = (path: [number, number][]) => {
        setNewCablePath(path);
        setIsCableFormOpen(true);
    };

    const handleCableEditRequest = (cable: CablePath) => {
        setSelectedCable(cable);
        setIsCableDrawerOpen(true);
    };

    const handleManageCores = (cable: CablePath) => {
        setSelectedCable(cable);
        setIsCoresFormOpen(true);
    };

    return (
        <div className="h-full flex flex-col gap-4">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Physical Assets & Cables Management</h1>
                    <p className="text-sm text-muted-foreground">
                        {canEdit
                            ? "Use map tools (top right) to draw points for Assets or line for Cables."
                            : "You are currently in VIEWER mode. Editing map assets is disabled."}
                    </p>
                </div>
                <div className="flex gap-4">
                    <div className="text-sm text-muted-foreground bg-card px-4 py-2 rounded-lg border border-border font-mono shadow-sm flex gap-2 items-center">
                        <span>🌍</span> ONUs: {isFetching ? '...' : onus?.length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground bg-card px-4 py-2 rounded-lg border border-border font-mono shadow-sm flex gap-2 items-center">
                        <span>🗄️</span> Assets: {isFetching ? '...' : assets.length}
                    </div>
                    <div className="text-sm text-muted-foreground bg-card px-4 py-2 rounded-lg border border-border font-mono shadow-sm flex gap-2 items-center">
                        <span>🔌</span> Cables: {isFetching ? '...' : cables.length}
                    </div>
                </div>
            </div>

            <div className="flex-1 w-full min-h-[600px]">
                <AdminMapView
                    assets={assets}
                    cables={cables}
                    onus={onus}
                    onAssetCreated={canEdit ? handleCreateRequest : undefined}
                    onAssetEdited={canEdit ? handleEditRequest : undefined}
                    onCableCreated={canEdit ? handleCableCreateRequest : undefined}
                    onCableEdited={canEdit ? handleCableEditRequest : undefined}
                    drawMode={canEdit ? "all" : "none"} // Set to none to hide tools or let draw tool active for both
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

            <AssetDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                asset={selectedAsset}
                onSuccess={fetchAssets}
            />

            {newCablePath && (
                <CableForm
                    isOpen={isCableFormOpen}
                    onClose={() => setIsCableFormOpen(false)}
                    path={newCablePath}
                    onSuccess={fetchAssets}
                />
            )}

            <CableDrawer
                isOpen={isCableDrawerOpen}
                onClose={() => setIsCableDrawerOpen(false)}
                cable={selectedCable}
                onSuccess={fetchAssets}
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
