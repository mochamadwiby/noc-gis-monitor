import { useState } from "react";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { AssetType } from "../maps/AdminMapView";

interface AssetFormProps {
    isOpen: boolean;
    onClose: () => void;
    lat: number;
    lng: number;
    onSuccess: () => void;
}

export function AssetForm({ isOpen, onClose, lat, lng, onSuccess }: AssetFormProps) {
    const [type, setType] = useState<AssetType>("ODP");
    const [name, setName] = useState("");
    const [capacity, setCapacity] = useState("");
    const [brand, setBrand] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError("");

        try {
            const payload: any = {
                name,
                latitude: lat,
                longitude: lng,
            };

            if (type === "OLT" && brand) payload.brand = brand;
            if (type !== "OLT" && capacity) payload.capacity = parseInt(capacity);

            // ODF and ODP need parent associations. For now we will allow them to be created
            // unassociated, or just let the API decide. The current API schemas we built allow null for OLT on ODF, 
            // but requires ODC on ODP. We will need an ODC selector for ODPs later.
            // For V1 of this form, let's keep it simple. If ODP, we might fail if we don't send odcId.

            const endpoint = `/api/assets/${type.toLowerCase()}`;

            // Temporary: if ODP, assign a dummy odcId or we'd need a dropdown.
            // To properly do this, we should fetch ODCs if type === 'ODP'. Let's just create ODC for now to test.
            if (type === "ODP") {
                setError("ODP creation requires selecting a parent ODC. Please choose ODC or OTB instead for testing.");
                setIsSubmitting(false);
                return;
            }

            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Gagal menyimpan data");

            onSuccess();
            onClose();

            // Reset form
            setName("");
            setCapacity("");
            setBrand("");

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Buat Asset Baru">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}

                <div>
                    <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Coordinate</label>
                    <div className="flex gap-4">
                        <Input value={lat.toFixed(6)} readOnly disabled className="bg-gray-100" />
                        <Input value={lng.toFixed(6)} readOnly disabled className="bg-gray-100" />
                    </div>
                </div>

                <div>
                    <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Jenis Asset</label>
                    <select
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                        value={type}
                        onChange={(e) => setType(e.target.value as AssetType)}
                    >
                        <option value="OLT">OLT (Pusat Server)</option>
                        <option value="ODF">ODF (Rak Distribusi)</option>
                        <option value="OTB">OTB / Joint Box</option>
                        <option value="ODC">ODC (Lemari Distribusi)</option>
                        <option value="ODP">ODP (Titik Tiang)</option>
                    </select>
                </div>

                <Input
                    label="Nama / Kode Asset"
                    required
                    placeholder="Misal: ODC-01-SDA"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />

                {type === "OLT" ? (
                    <Input
                        label="Merek Tipe (Opsional)"
                        placeholder="ZTE C320"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                    />
                ) : (
                    <Input
                        label="Kapasitas Core"
                        type="number"
                        placeholder={type === 'ODC' || type === 'ODF' ? "144" : type === 'OTB' ? '24' : '8'}
                        value={capacity}
                        onChange={(e) => setCapacity(e.target.value)}
                    />
                )}

                {/* Temporary warning for ODP relation requirement */}
                {type === "ODP" && (
                    <p className="text-xs text-orange-500">
                        Peringatan: Pembuatan ODP saat ini membutuhkan relasi ke ODC (Dropdown ODC belum diimplementasikan di versi demo ini).
                    </p>
                )}

                <div className="flex justify-end gap-3 mt-6">
                    <Button type="button" variant="secondary" onClick={onClose}>Batal</Button>
                    <Button type="submit" isLoading={isSubmitting}>Simpan Asset</Button>
                </div>
            </form>
        </Modal>
    );
}
