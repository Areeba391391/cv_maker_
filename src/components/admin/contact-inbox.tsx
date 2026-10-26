"use client";

import { useEffect, useState } from "react";
import { Mail, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format-date";

type Msg = {
  id: string;
  name: string;
  workspace_name: string | null;
  phone: string | null;
  email: string | null;
  message: string;
  created_at: string;
  read_at: string | null;
};

export function ContactInbox() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/contact");
      const data = (await res.json()) as { messages?: Msg[]; error?: string };
      if (!res.ok) throw new Error(data.error || "Could not load messages");
      setMessages(data.messages || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function markRead(id: string) {
    try {
      const res = await fetch("/api/contact", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Update failed");
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, read_at: new Date().toISOString() } : m)),
      );
      toast.success("Marked as read");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  const unread = messages.filter((m) => !m.read_at).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--muted)]">
          {loading
            ? "Loading…"
            : unread
              ? `${unread} unread · ${messages.length} total`
              : `${messages.length} message${messages.length === 1 ? "" : "s"}`}
        </p>
        <Button type="button" size="sm" variant="outline" onClick={() => void load()}>
          Refresh
        </Button>
      </div>

      {error ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {error}
        </p>
      ) : null}

      {!loading && !messages.length && !error ? (
        <p className="text-sm text-[var(--muted)]">
          No messages yet. When someone uses Contact on the website, they show up here.
        </p>
      ) : null}

      <ul className="space-y-2">
        {messages.map((m) => (
          <li
            key={m.id}
            className={`rounded-xl border px-4 py-3 ${
              m.read_at
                ? "border-[var(--border)] bg-white"
                : "border-[var(--cobalt)]/30 bg-[var(--mist)]/50"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-semibold text-[var(--ink)]">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-[var(--cobalt)]" />
                  {m.name}
                  {!m.read_at ? (
                    <span className="rounded-md bg-[var(--signal)] px-1.5 py-0.5 text-[10px] font-bold text-white">
                      NEW
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {formatDateTime(m.created_at)}
                  {m.workspace_name ? ` · ${m.workspace_name}` : ""}
                  {m.phone ? ` · ${m.phone}` : ""}
                  {m.email ? ` · ${m.email}` : ""}
                </p>
              </div>
              {!m.read_at ? (
                <Button type="button" size="sm" variant="outline" onClick={() => void markRead(m.id)}>
                  <Check className="h-3.5 w-3.5" />
                  Read
                </Button>
              ) : null}
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--ink)]">
              {m.message}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
