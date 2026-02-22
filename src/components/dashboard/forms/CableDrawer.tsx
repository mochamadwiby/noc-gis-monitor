import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CablePath } from "../maps/AdminMapView";

interface CableDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    cable: CablePath | null;
    onSuccess: () => void;
    onManageCores: (cable: CablePath) => void;
}

export function CableDrawer({ isOpen, onClose, cable, onSuccess, onManageCores }: CableDrawerProps) {
    const [name, setName] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (cable) {
            setName(cable.name || "");
            setError("");
        }
    }, [cable]);

    if (!cable) return null;

    const handleDelete = async () => {
        if (!confirm(`Are you sure you want to delete cable ${cable.name}? This will also delete all its cores.`)) return;

        setIsDeleting(true);
        setError("");

        try {
            const endpoint = `/api/cables/${cable.id}`;
            const res = await fetch(endpoint, { method: "DELETE" });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Gagal menghapus kabel");

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
                    <DialogTitle>Kelola Kabel: {cable.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-muted-foreground uppercase">Tipe</label>
                            <p className="font-medium text-foreground">{cable.type}</p>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-muted-foreground uppercase">Kapasitas</label>
                            <p className="font-medium text-foreground">{cable.capacity} Core</p>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-border mt-4">
                        <Button
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => {
                                onClose();
                                onManageCores(cable);
                            }}
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                            Manajemen Sambungan Core
                        </Button>
                    </div>
                </div>

                <DialogFooter className="mt-2 flex justify-between w-full sm:justify-between items-center border-t border-border pt-4">
                    <Button type="button" variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                        {isDeleting ? "Menghapus..." : "Hapus Kabel"}
                    </Button>
                    <Button type="button" variant="secondary" onClick={onClose}>Tutup</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
