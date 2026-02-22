import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AssetType, AssetNode } from "../maps/AdminMapView";

interface AssetDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    asset: AssetNode | null;
    onSuccess: () => void;
}

export function AssetDrawer({ isOpen, onClose, asset, onSuccess }: AssetDrawerProps) {
    const [name, setName] = useState("");
    const [capacity, setCapacity] = useState("");
    const [brand, setBrand] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState("");

    // Relationships
    const [odcList, setOdcList] = useState<any[]>([]);
    const [oltList, setOltList] = useState<any[]>([]);
    const [odcId, setOdcId] = useState("");
    const [oltId, setOltId] = useState("");

    useEffect(() => {
        if (isOpen) {
            fetchRelations();
        }
    }, [isOpen]);

    const fetchRelations = async () => {
        try {
            const [odcRes, oltRes] = await Promise.all([
                fetch("/api/assets/odc"),
                fetch("/api/assets/olt")
            ]);

            if (odcRes.ok) setOdcList(await odcRes.json());
            if (oltRes.ok) setOltList(await oltRes.json());
        } catch (err) {
            console.error("Failed to fetch relations for dropdowns", err);
        }
    };

    useEffect(() => {
        if (asset) {
            setName(asset.name || "");
            setCapacity(asset.capacity ? asset.capacity.toString() : "");
            setBrand(asset.brand || "");

            // Assume the API might have returned parent IDs or nested objects in future iterations. 
            // For now, if the asset object has odcId or oltId, set it.
            if (asset.type === "ODP" && (asset as any).odcId) setOdcId((asset as any).odcId);
            if (asset.type === "ODP" && (asset as any).odc && (asset as any).odc.id) setOdcId((asset as any).odc.id);
            if (asset.type === "ODF" && (asset as any).oltId) setOltId((asset as any).oltId);
            if (asset.type === "ODF" && (asset as any).olt && (asset as any).olt.id) setOltId((asset as any).olt.id);

            setError("");
        }
    }, [asset]);

    if (!asset) return null;

    const type = asset.type;

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError("");

        try {
            const payload: any = { name };
            if (type === "OLT" && brand) payload.brand = brand;
            if (type !== "OLT" && capacity) payload.capacity = parseInt(capacity);

            if (type === "ODP" && odcId) payload.odcId = odcId;
            if (type === "ODF") payload.oltId = oltId || null; // Allow removing OLT relation

            const endpoint = `/api/assets/${type.toLowerCase()}/${asset.id}`;

            const res = await fetch(endpoint, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Gagal mengupdate data");

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Are you sure you want to delete this ${type}?`)) return;

        setIsDeleting(true);
        setError("");

        try {
            const endpoint = `/api/assets/${type.toLowerCase()}/${asset.id}`;
            const res = await fetch(endpoint, { method: "DELETE" });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Gagal menghapus data");

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Asset: {type}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleUpdate} className="space-y-4">
                    {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}

                    <div>
                        <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Coordinate</label>
                        <div className="flex gap-4">
                            <Input value={asset.latitude.toFixed(6)} readOnly disabled className="bg-gray-100 dark:bg-gray-800" />
                            <Input value={asset.longitude.toFixed(6)} readOnly disabled className="bg-gray-100 dark:bg-gray-800" />
                        </div>
                    </div>

                    <div>
                        <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Nama / Kode Asset</label>
                        <Input
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    {type === "OLT" ? (
                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Merek Tipe</label>
                            <Input
                                value={brand}
                                onChange={(e) => setBrand(e.target.value)}
                            />
                        </div>
                    ) : (
                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Kapasitas Core</label>
                            <Input
                                type="number"
                                value={capacity}
                                onChange={(e) => setCapacity(e.target.value)}
                            />
                        </div>
                    )}

                    {type === "ODP" && (
                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Relasi Parent ODC <span className="text-red-500">*</span></label>
                            <select
                                required
                                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                                value={odcId}
                                onChange={(e) => setOdcId(e.target.value)}
                            >
                                <option value="">-- Pilih ODC --</option>
                                {odcList.map((odc) => (
                                    <option key={odc.id} value={odc.id}>{odc.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {type === "ODF" && (
                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Relasi Parent OLT (Opsional)</label>
                            <select
                                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                                value={oltId}
                                onChange={(e) => setOltId(e.target.value)}
                            >
                                <option value="">-- Tanpa Parent OLT --</option>
                                {oltList.map((olt) => (
                                    <option key={olt.id} value={olt.id}>{olt.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <DialogFooter className="mt-6 flex justify-between w-full sm:justify-between items-center">
                        <Button type="button" variant="destructive" onClick={handleDelete} disabled={isDeleting || isSubmitting}>
                            {isDeleting ? "Menghapus..." : "Hapus Asset"}
                        </Button>
                        <div className="flex space-x-2">
                            <Button type="button" variant="secondary" onClick={onClose}>Batal</Button>
                            <Button type="submit" disabled={isSubmitting || isDeleting}>
                                {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
