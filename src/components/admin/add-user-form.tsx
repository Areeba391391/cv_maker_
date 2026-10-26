"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  /** Owner can create Admins (managers). Managers only create Users. */
  canCreateAdmins?: boolean;
};

export function AdminAddUserForm({ canCreateAdmins = false }: Props) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"employee" | "manager">("employee");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          password,
          role: canCreateAdmins ? role : "employee",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not add user");
      toast.success(
        role === "manager" && canCreateAdmins
          ? "Admin created — they can open Admin desk"
          : "User created — they can sign in and make CVs",
      );
      setFullName("");
      setEmail("");
      setPassword("");
      setRole("employee");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className="space-y-3"
      onSubmit={onSubmit}
      autoComplete="off"
      data-lpignore="true"
      data-1p-ignore
      data-bwignore
      suppressHydrationWarning
    >
      <div className="space-y-1.5">
        <Label htmlFor="staff-name">Full name</Label>
        <Input
          id="staff-name"
          name="staff-full-name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Operator name"
          autoComplete="off"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="staff-email">Email</Label>
        <Input
          id="staff-email"
          name="staff-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@shop.com"
          autoComplete="off"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="staff-pass">Password</Label>
        <Input
          id="staff-pass"
          name="staff-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
          minLength={6}
          autoComplete="new-password"
          required
        />
      </div>
      {canCreateAdmins ? (
        <div className="space-y-1.5">
          <Label>Access</Label>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Access level">
            <button
              type="button"
              onClick={() => setRole("employee")}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-left text-sm transition",
                role === "employee"
                  ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                  : "border-[var(--border)] bg-white text-[var(--ink)] hover:border-[var(--cobalt)]/40",
              )}
            >
              <span className="block font-semibold">User</span>
              <span className={cn("mt-0.5 block text-[11px]", role === "employee" ? "text-white/70" : "text-[var(--muted)]")}>
                Make CVs only
              </span>
            </button>
            <button
              type="button"
              onClick={() => setRole("manager")}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-left text-sm transition",
                role === "manager"
                  ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                  : "border-[var(--border)] bg-white text-[var(--ink)] hover:border-[var(--cobalt)]/40",
              )}
            >
              <span className="block font-semibold">Admin</span>
              <span className={cn("mt-0.5 block text-[11px]", role === "manager" ? "text-white/70" : "text-[var(--muted)]")}>
                Desk + customers
              </span>
            </button>
          </div>
        </div>
      ) : null}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {loading ? "Creating…" : "Add team member"}
      </Button>
    </form>
  );
}
