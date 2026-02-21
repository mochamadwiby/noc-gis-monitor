"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/dashboard/ui";

export default function SyncButton() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const handleSync = async () => {
        setLoading(true);
        setMessage("");

        try {
            const res = await fetch("/api/sync/smartolt");
            const data = await res.json();

            if (res.ok) {
                setMessage(`Success: ${data.syncedCount} records synced.`);
                setTimeout(() => {
                    setMessage("");
                    router.refresh();
                }, 2000);
            } else {
                setMessage(`Error: ${data.error}`);
            }
        } catch (error) {
            setMessage("Failed to trigger sync.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center gap-4">
            {message && (
                <span className={`text-sm font-medium px-3 py-1 rounded-full ${message.startsWith('Error') ? 'bg-red-50 text-red-600 dark:bg-red-900/30' : 'bg-green-50 text-green-600 dark:bg-green-900/30'}`}>
                    {message}
                </span>
            )}
            <Button
                onClick={handleSync}
                isLoading={loading}
                variant="primary"
                className="shadow-sm shadow-blue-500/20"
            >
                {!loading && <span className="mr-2">🔄</span>}
                {loading ? "Syncing API..." : "Fetch SmartOLT Now"}
            </Button>
        </div>
    );
}
