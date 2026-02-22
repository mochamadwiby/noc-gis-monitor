import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CablePath } from "../maps/AdminMapView";

interface CableCore {
    id: string;
    cableId: string;
    number: number;
    color: string;
    tubeColor: string | null;
    startType: string | null;
    startId: string | null;
    endType: string | null;
    endId: string | null;
}

interface CableCoresFormProps {
    isOpen: boolean;
    onClose: () => void;
    cable: CablePath | null;
}

export function CableCoresForm({ isOpen, onClose, cable }: CableCoresFormProps) {
    const [cores, setCores] = useState<CableCore[]>([]);
    const [isFetching, setIsFetching] = useState(false);
    const [error, setError] = useState("");

    // Temporary basic UI state to show functionality
    const [editingCoreId, setEditingCoreId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{ startType: string; startId: string; endType: string; endId: string }>({
        startType: "", startId: "", endType: "", endId: ""
    });

    useEffect(() => {
        if (isOpen && cable) {
            fetchCores();
        }
    }, [isOpen, cable]);

    const fetchCores = async () => {
        if (!cable) return;
        setIsFetching(true);
        setError("");

        try {
            // We can fetch cores via the cables endpoint if we modify it, but cables endpoint already 
            // incudes cores. Let's fetch the specific cable with cores.
            const res = await fetch("/api/cables");
            const allCables = await res.json();
            const thisCable = allCables.find((c: any) => c.id === cable.id);

            if (thisCable && thisCable.cores) {
                // Sort by core number
                const sorted = thisCable.cores.sort((a: CableCore, b: CableCore) => a.number - b.number);
                setCores(sorted);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsFetching(false);
        }
    };

    const handleEditSave = async (coreId: string) => {
        try {
            const res = await fetch(`/api/cables/cores/${coreId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    startType: editForm.startType || null,
                    startId: editForm.startId || null,
                    endType: editForm.endType || null,
                    endId: editForm.endId || null,
                })
            });

            if (!res.ok) throw new Error("Gagal menyimpan update core");

            setEditingCoreId(null);
            fetchCores(); // Refresh list
        } catch (err: any) {
            alert(err.message);
        }
    };

    const getCssColor = (colorName: string) => {
        const map: Record<string, string> = {
            "Blue": "#2196F3",
            "Orange": "#FF9800",
            "Green": "#4CAF50",
            "Brown": "#795548",
            "Slate": "#9E9E9E",
            "White": "#FFFFFF",
            "Red": "#F44336",
            "Black": "#000000",
            "Yellow": "#FFEB3B",
            "Violet": "#9C27B0",
            "Rose": "#E91E63",
            "Aqua": "#00BCD4"
        };
        return map[colorName] || "#CCCCCC";
    };

    if (!cable) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Konfigurasi Core: {cable.name}</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto pr-4 py-4">
                    {error && <div className="p-3 mb-4 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}

                    {isFetching ? (
                        <div className="flex justify-center p-8 text-muted-foreground">Memuat data core...</div>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-12 gap-2 text-xs font-bold text-muted-foreground uppercase border-b border-border pb-2 px-2">
                                <div className="col-span-1">No</div>
                                <div className="col-span-1">Warna</div>
                                <div className="col-span-1">Tube</div>
                                <div className="col-span-4 flex justify-between">
                                    <span>Source (A)</span>
                                </div>
                                <div className="col-span-4 flex justify-between">
                                    <span>Dest (B)</span>
                                </div>
                                <div className="col-span-1 text-center">Aksi</div>
                            </div>

                            {cores.map((core) => {
                                const isEditing = editingCoreId === core.id;

                                return (
                                    <div key={core.id} className="grid grid-cols-12 gap-2 items-center text-sm border border-border rounded-lg p-2 bg-card">
                                        <div className="col-span-1 font-mono font-bold">{core.number}</div>

                                        <div className="col-span-1 flex justify-center">
                                            <div
                                                className="w-6 h-6 rounded-full border border-gray-300 shadow-sm"
                                                style={{ backgroundColor: getCssColor(core.color) }}
                                                title={core.color}
                                            />
                                        </div>

                                        <div className="col-span-1 flex justify-center">
                                            <div
                                                className="w-6 h-6 border-2 border-gray-400"
                                                style={{ backgroundColor: getCssColor(core.tubeColor || "White") }}
                                                title={core.tubeColor || "No Tube"}
                                            />
                                        </div>

                                        <div className="col-span-4 flex gap-1 items-center bg-muted/30 p-1 rounded">
                                            {isEditing ? (
                                                <>
                                                    <select
                                                        className="w-16 p-1 text-xs border rounded bg-background"
                                                        value={editForm.startType}
                                                        onChange={(e) => setEditForm({ ...editForm, startType: e.target.value })}
                                                    >
                                                        <option value="">-</option>
                                                        <option value="OLT">OLT</option>
                                                        <option value="ODF">ODF</option>
                                                        <option value="ODC">ODC</option>
                                                        <option value="OTB">OTB</option>
                                                    </select>
                                                    <input
                                                        className="flex-1 p-1 text-xs border rounded bg-background"
                                                        placeholder="Asset ID/Name"
                                                        value={editForm.startId}
                                                        onChange={(e) => setEditForm({ ...editForm, startId: e.target.value })}
                                                    />
                                                </>
                                            ) : (
                                                <div className="truncate w-full text-xs">
                                                    {core.startType ? <span className="font-bold mr-1 bg-primary/10 text-primary px-1 rounded">{core.startType}</span> : <span className="text-muted-foreground/50 italic mr-1">Not Connected</span>}
                                                    {core.startId}
                                                </div>
                                            )}
                                        </div>

                                        <div className="col-span-4 flex gap-1 items-center bg-muted/30 p-1 rounded">
                                            {isEditing ? (
                                                <>
                                                    <select
                                                        className="w-16 p-1 text-xs border rounded bg-background"
                                                        value={editForm.endType}
                                                        onChange={(e) => setEditForm({ ...editForm, endType: e.target.value })}
                                                    >
                                                        <option value="">-</option>
                                                        <option value="ODF">ODF</option>
                                                        <option value="ODC">ODC</option>
                                                        <option value="OTB">OTB</option>
                                                        <option value="ODP">ODP</option>
                                                    </select>
                                                    <input
                                                        className="flex-1 p-1 text-xs border rounded bg-background"
                                                        placeholder="Asset ID/Name"
                                                        value={editForm.endId}
                                                        onChange={(e) => setEditForm({ ...editForm, endId: e.target.value })}
                                                    />
                                                </>
                                            ) : (
                                                <div className="truncate w-full text-xs">
                                                    {core.endType ? <span className="font-bold mr-1 bg-primary/10 text-primary px-1 rounded">{core.endType}</span> : <span className="text-muted-foreground/50 italic mr-1">Not Connected</span>}
                                                    {core.endId}
                                                </div>
                                            )}
                                        </div>

                                        <div className="col-span-1 flex justify-center">
                                            {isEditing ? (
                                                <Button size="sm" onClick={() => handleEditSave(core.id)} className="h-7 text-xs px-2">
                                                    Save
                                                </Button>
                                            ) : (
                                                <Button size="sm" variant="ghost" onClick={() => {
                                                    setEditForm({
                                                        startType: core.startType || "",
                                                        startId: core.startId || "",
                                                        endType: core.endType || "",
                                                        endId: core.endId || ""
                                                    });
                                                    setEditingCoreId(core.id);
                                                }} className="h-7 text-xs px-2">
                                                    Edit
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <DialogFooter className="mt-4 pt-4 border-t border-border">
                    <Button type="button" variant="secondary" onClick={onClose}>Tutup</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
