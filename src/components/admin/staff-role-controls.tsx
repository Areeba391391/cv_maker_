"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { isAdminRole, roleLabel } from "@/lib/auth/roles";

type Props = {
  staffId: string;
  role: string;
  /** Current signed-in user is workspace owner */
  canManage: boolean;
  isSelf: boolean;
  cvCount: number;
};

export function StaffRoleControls({ staffId, role, canManage, isSelf, cvCount }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function setRole(next: "manager" | "employee") {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${staffId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: next }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not update role");
      toast.success(next === "manager" ? "Promoted to Admin" : "Changed to User");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <span className="rounded-md bg-[var(--mist)] px-2 py-0.5 text-xs font-semibold tabular-nums text-[var(--ink)]">
        {cvCount} CV{cvCount === 1 ? "" : "s"}
      </span>
      <span
        className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
          isAdminRole(role) ? "bg-[var(--ink)] text-white" : "bg-[var(--mist)] text-[var(--ink)]"
        }`}
      >
        {roleLabel(role)}
      </span>
      {canManage && !isSelf && role !== "owner" ? (
        loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-[var(--muted)]" />
        ) : role === "manager" ? (
          <Button type="button" size="sm" variant="outline" onClick={() => void setRole("employee")}>
            Make User
          </Button>
        ) : (
          <Button type="button" size="sm" variant="outline" onClick={() => void setRole("manager")}>
            Make Admin
          </Button>
        )
      ) : null}
    </div>
  );
}
