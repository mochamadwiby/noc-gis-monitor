import Sidebar from "./sidebar";
import AuthProvider from "@/components/AuthProvider";

export const metadata = {
    title: "Dashboard - NOC GIS Monitor",
    description: "Manage NOC Infrastructure",
};

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthProvider>
            <div className="flex h-screen bg-background text-foreground">
                <Sidebar />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-muted/20">
                    <div className="container px-6 py-8 mx-auto">{children}</div>
                </main>
            </div>
        </AuthProvider>
    );
}
