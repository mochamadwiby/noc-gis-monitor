import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface CableFormProps {
    isOpen: boolean;
    onClose: () => void;
    path: [number, number][];
    onSuccess: () => void;
}

export function CableForm({ isOpen, onClose, path, onSuccess }: CableFormProps) {
    const [name, setName] = useState("");
    const [type, setType] = useState<"BACKBONE" | "DISTRIBUTION" | "DROP">("DISTRIBUTION");
    const [capacity, setCapacity] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError("");

        try {
            const payload = {
                name,
                type,
                capacity: parseInt(capacity),
                path,
            };

            const res = await fetch("/api/cables", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Gagal menyimpan kabel");

            onSuccess();
            onClose();

            // Reset form
            setName("");
            setCapacity("");
            setType("DISTRIBUTION");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Buat Kabel Baru</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}

                    <div>
                        <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Panjang Path (Titik)</label>
                        <Input value={`${path.length} titik koordinat`} readOnly disabled className="bg-gray-100 dark:bg-gray-800" />
                    </div>

                    <div>
                        <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Jenis Kabel</label>
                        <select
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                            value={type}
                            onChange={(e) => setType(e.target.value as any)}
                        >
                            <option value="BACKBONE">BACKBONE</option>
                            <option value="DISTRIBUTION">DISTRIBUTION</option>
                            <option value="DROP">DROP</option>
                        </select>
                    </div>

                    <div>
                        <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Nama / Kode Kabel</label>
                        <Input
                            required
                            placeholder="Misal: CBL-DIST-01"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Kapasitas Core</label>
                        <select
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                            value={capacity}
                            onChange={(e) => setCapacity(e.target.value)}
                            required
                        >
                            <option value="" disabled>Pilih Kapasitas</option>
                            <option value="1">1 Core</option>
                            <option value="2">2 Core</option>
                            <option value="4">4 Core</option>
                            <option value="6">6 Core</option>
                            <option value="8">8 Core</option>
                            <option value="10">10 Core</option>
                            <option value="12">12 Core</option>
                            <option value="24">24 Core</option>
                            <option value="48">48 Core</option>
                            <option value="96">96 Core</option>
                            <option value="144">144 Core</option>
                            <option value="288">288 Core</option>
                        </select>
                    </div>

                    <DialogFooter className="mt-6">
                        <Button type="button" variant="secondary" onClick={onClose}>Batal</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Menyimpan..." : "Simpan Kabel"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
