"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { friendlyAuthError } from "@/lib/auth/errors";
import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type WorkspaceType,
  workspaceTypeOptions,
} from "@/lib/workspace/types";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [shopName, setShopName] = useState("");
  const [workspaceType, setWorkspaceType] = useState<WorkspaceType>("general");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName, shopName, workspaceType }),
      });
      const payload = await res.json().catch(() => ({}));

      if (res.ok) {
        const supabase = createClient();
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          toast.success("Account created. Please sign in.");
          router.push("/login");
          return;
        }
        toast.success("Workspace ready");
        router.push("/admin");
        router.refresh();
        return;
      }

      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            shop_name: shopName,
            workspace_type: workspaceType,
          },
        },
      });

      if (error) {
        if (typeof payload.error === "string" && payload.error.includes("truncated")) {
          throw new Error(payload.error);
        }
        throw error;
      }

      if (data.session) {
        toast.success("Workspace ready");
        router.push("/admin");
        router.refresh();
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (!signInError) {
        toast.success("Signed in");
        router.push("/admin");
        router.refresh();
        return;
      }

      toast.success("Account created. Please sign in.");
      router.push("/login");
    } catch (error) {
      toast.error(friendlyAuthError(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Create workspace"
      subtitle="One account for any desk — shops, coaches, schools, HR, freelancers, and more."
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <Label htmlFor="workspaceType">Where will you use this?</Label>
          <select
            id="workspaceType"
            className="flex h-11 w-full rounded-xl border border-stone-200 bg-white px-3.5 text-sm font-medium text-[var(--ink)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            value={workspaceType}
            onChange={(e) => setWorkspaceType(e.target.value as WorkspaceType)}
          >
            {workspaceTypeOptions().map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.title}
              </option>
            ))}
          </select>
          <p className="text-xs text-[var(--muted)]">
            {workspaceTypeOptions().find((o) => o.id === workspaceType)?.description}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="shop">Workspace / business name</Label>
          <Input
            id="shop"
            placeholder="e.g. City Careers, Ali Computers, Horizon HR"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Your name</Label>
          <Input
            id="name"
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@business.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            minLength={6}
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Button className="w-full" size="lg" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {loading ? "Creating…" : "Create account"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-stone-500">
        Already registered?{" "}
        <Link href="/login" className="font-medium text-[var(--cobalt)] hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
