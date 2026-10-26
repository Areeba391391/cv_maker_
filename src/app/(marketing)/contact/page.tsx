"use client";

import { useState } from "react";
import Image from "next/image";
import { CheckCircle2, Mail, MessageCircle, Phone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "hello@aicvmaker.com";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [shop, setShop] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !message.trim()) {
      toast.error("Please add your name and message");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          workspace: shop.trim(),
          phone: phone.trim(),
          email: email.trim(),
          message: message.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not send message");
      setSent(true);
      setMessage("");
      toast.success("Message sent — we will see it in Admin → Messages");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Send failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-fade">
      <section className="relative overflow-hidden border-b border-[var(--border)] text-white">
        <div className="absolute inset-0">
          <Image
            src="/marketing/cv-sample-professional.jpg"
            alt=""
            fill
            priority
            className="object-cover object-top"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--ink)] via-[var(--ink)]/92 to-[var(--ink)]/70" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--signal)]">
            Contact
          </p>
          <h1 className="font-display mt-3 max-w-2xl text-4xl font-extrabold tracking-tight sm:text-5xl">
            Questions, demos, or setup help.
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/70">
            Send a message — it lands in the admin inbox. We reply with clear next steps.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-8">
          {[
            {
              icon: Phone,
              title: "Call / WhatsApp",
              text: "Prefer talking? Leave your number in the form and we will call back.",
              href: "tel:+920000000000",
            },
            {
              icon: Mail,
              title: "Email",
              text: CONTACT_EMAIL,
              href: `mailto:${CONTACT_EMAIL}`,
            },
            {
              icon: MessageCircle,
              title: "Start free workspace",
              text: "Create an account and make your first CV in seconds.",
              href: "/signup",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <a key={item.title} href={item.href} className="group flex gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[var(--border)] bg-white text-[var(--cobalt)] transition group-hover:border-[var(--cobalt)]">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="font-display text-base font-bold text-[var(--ink)] group-hover:text-[var(--cobalt)]">
                    {item.title}
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{item.text}</p>
                </div>
              </a>
            );
          })}
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-[var(--shadow)] sm:p-8">
          {sent ? (
            <div className="flex flex-col items-start gap-3 py-4">
              <CheckCircle2 className="h-9 w-9 text-[var(--signal)]" />
              <h2 className="font-display text-2xl font-bold text-[var(--ink)]">Message received</h2>
              <p className="text-sm text-[var(--muted)]">
                Your note is saved in our admin inbox. We will get back to you soon.
              </p>
              <Button type="button" variant="outline" onClick={() => setSent(false)}>
                Write another
              </Button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Your name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Asif"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shop">Workspace name</Label>
                  <Input
                    id="shop"
                    value={shop}
                    onChange={(e) => setShop(e.target.value)}
                    placeholder="City Careers"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone / WhatsApp</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="03xxxxxxxxx"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email (optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="I want help setting up AI CV Maker…"
                  required
                />
              </div>
              <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={loading}>
                {loading ? "Sending…" : "Send message"}
              </Button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
