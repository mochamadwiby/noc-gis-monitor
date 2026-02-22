"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type User = {
    id: string;
    email: string;
    name: string | null;
    role: "ADMIN" | "DRAFTER" | "VIEWER";
    createdAt: string;
};

export default function UsersPage() {
    const { data: session } = useSession();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Form States
    const [formMode, setFormMode] = useState<"create" | "edit">("create");
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<"ADMIN" | "DRAFTER" | "VIEWER">("VIEWER");

    // UI States
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/users");
            if (!res.ok) throw new Error("Failed to fetch users");
            const data = await res.json();
            setUsers(data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (session?.user?.role === "ADMIN") {
            fetchUsers();
        }
    }, [session]);

    const handleOpenCreate = () => {
        setFormMode("create");
        setCurrentUserId(null);
        setEmail("");
        setName("");
        setPassword("");
        setRole("VIEWER");
        setError("");
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (user: User) => {
        setFormMode("edit");
        setCurrentUserId(user.id);
        setEmail(user.email);
        setName(user.name || "");
        setPassword(""); // don't load password
        setRole(user.role);
        setError("");
        setIsDialogOpen(true);
    };

    const handleDelete = async (userId: string) => {
        if (!confirm("Are you sure you want to delete this user?")) return;
        try {
            const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to delete user");
            }
            fetchUsers();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError("");

        try {
            const payload: any = { email, name, role };
            if (password) payload.password = password;

            let res;
            if (formMode === "create") {
                res = await fetch("/api/users", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
            } else {
                res = await fetch(`/api/users/${currentUserId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
            }

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Something went wrong");

            setIsDialogOpen(false);
            fetchUsers();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (session?.user?.role !== "ADMIN") {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <p className="text-muted-foreground">You do not have permission to view this page. (ADMIN only)</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">User Management</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage NOC team access, Drafters, and Admin roles.
                    </p>
                </div>
                <Button onClick={handleOpenCreate}>+ Add New User</Button>
            </div>

            <div className="rounded-md border border-border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground text-sm">
                                    Loading users...
                                </TableCell>
                            </TableRow>
                        ) : users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground text-sm">
                                    No users found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">{user.email}</TableCell>
                                    <TableCell>{user.name || "-"}</TableCell>
                                    <TableCell>
                                        <Badge variant={
                                            user.role === "ADMIN" ? "default" :
                                                user.role === "DRAFTER" ? "secondary" : "outline"
                                        }>
                                            {user.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="outline" size="sm" onClick={() => handleOpenEdit(user)}>Edit</Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => handleDelete(user.id)}
                                            disabled={session.user.id === user.id}
                                        >
                                            Delete
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Dialog Form for Create/Edit */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{formMode === "create" ? "Create New User" : "Edit User"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-md text-sm">{error}</div>}

                        <div>
                            <label className="block mb-2 text-sm font-medium text-foreground">Email Address</label>
                            <Input
                                required
                                type="email"
                                placeholder="drafter@noc.local"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block mb-2 text-sm font-medium text-foreground">Full Name</label>
                            <Input
                                placeholder="John Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block mb-2 text-sm font-medium text-foreground">
                                {formMode === "create" ? "Password" : "New Password (Leave blank to keep current)"}
                            </label>
                            <Input
                                required={formMode === "create"}
                                type="password"
                                placeholder={formMode === "create" ? "******" : "******"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block mb-2 text-sm font-medium text-foreground">Role</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                value={role}
                                onChange={(e) => setRole(e.target.value as "ADMIN" | "DRAFTER" | "VIEWER")}
                            >
                                <option value="ADMIN">ADMIN</option>
                                <option value="DRAFTER">DRAFTER (Edit Map)</option>
                                <option value="VIEWER">VIEWER (Read Only)</option>
                            </select>
                        </div>

                        <DialogFooter className="mt-6">
                            <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Saving..." : "Save User"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

        </div>
    );
}
