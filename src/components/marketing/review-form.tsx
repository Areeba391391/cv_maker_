"use client";

import { useState } from "react";
import { CheckCircle2, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ReviewForm() {
  const [name, setName] = useState("");
  const [shop, setShop] = useState("");
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !message.trim()) {
      toast.error("Please add your name and review");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          workspace: shop.trim(),
          rating,
          message: message.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not send review");
      setSent(true);
      setMessage("");
      toast.success("Thanks — review saved for admin approval");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Send failed");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-white p-6 text-center shadow-[var(--shadow)]">
        <CheckCircle2 className="mx-auto h-8 w-8 text-[var(--signal)]" />
        <p className="font-display mt-3 text-lg font-bold text-[var(--ink)]">Review received</p>
        <p className="mt-1 text-sm text-[var(--muted)]">We will approve it before it appears publicly.</p>
        <Button type="button" variant="outline" className="mt-4" onClick={() => setSent(false)}>
          Write another
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow)] sm:p-6"
    >
      <p className="font-display text-base font-bold text-[var(--ink)]">Share your experience</p>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Ratings go to Admin first — then show on this page when approved.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="home-rev-name">Name</Label>
          <Input
            id="home-rev-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="home-rev-shop">Workspace (optional)</Label>
          <Input id="home-rev-shop" value={shop} onChange={(e) => setShop(e.target.value)} />
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        <Label>Rating</Label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className="rounded-lg p-1 transition hover:bg-[var(--mist)]"
              aria-label={`${n} stars`}
            >
              <Star
                className={`h-5 w-5 ${
                  n <= rating ? "fill-amber-500 text-amber-500" : "text-stone-300"
                }`}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        <Label htmlFor="home-rev-msg">Review</Label>
        <Textarea
          id="home-rev-msg"
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Fast generate, clean print…"
          required
        />
      </div>
      <Button type="submit" className="mt-4" disabled={loading}>
        {loading ? "Sending…" : "Submit review"}
      </Button>
    </form>
  );
}
