"use client";

import { useState } from "react";
import { MailIcon, CheckIcon } from "@/components/icons/Icons";

// The Web3Forms access key is NEVER read or exposed here. Submission is
// proxied through our own server route (/api/contact), which holds the key
// server-side (env var WEB3FORMS_KEY, no NEXT_PUBLIC_ prefix) and forwards
// the request to Web3Forms. The browser — and anyone opening dev tools —
// only ever sees a call to our own /api/contact endpoint, never the key.
// To enable the form: get a key in ~30 seconds, no account needed, at
// https://web3forms.com, then set WEB3FORMS_KEY in your .env.local / in
// Vercel's Environment Variables (see .env.example).

type Status = "idle" | "sending" | "sent" | "error" | "unconfigured";

export default function ContactForm({ toEmail }: { toEmail: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || status === "sending") return;
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message, toEmail }),
      });
      const json = await res.json();
      if (json.success) {
        setStatus("sent");
        setName("");
        setEmail("");
        setMessage("");
      } else if (json.error === "not_configured") {
        setStatus("unconfigured");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "unconfigured") {
    // Falls back to a plain mailto link until WEB3FORMS_KEY is set on the
    // server, so the button never appears completely broken during setup.
    return (
      <a
        href={`mailto:${toEmail}`}
        className="pressable focus-ring flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-l from-gold-bright to-gold font-semibold text-[#1a1407] disabled:opacity-60"
      >
        <MailIcon size={16} />
        تواصل معنا
      </a>
    );
  }

  if (status === "sent") {
    return (
      <p className="flex items-center gap-2 rounded-2xl bg-gold/15 px-4 py-3 text-sm font-semibold text-gold-bright">
        <CheckIcon size={16} />
        وصلت رسالتك، شكرًا لتواصلك معنا.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="w-full space-y-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="اسمك (اختياري)"
        className="field "
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="إيميلك (اختياري، لو عايز رد)"
        className="field "
      />
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="رسالتك أو اقتراحك..."
        required
        rows={3}
        className="field !rounded-3xl resize-none "
      />
      <button
        type="submit"
        disabled={status === "sending" || !message.trim()}
        className="pressable focus-ring flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-l from-gold-bright to-gold font-semibold text-[#1a1407] disabled:opacity-60"
      >
        <MailIcon size={16} />
        {status === "sending" ? "جارٍ الإرسال..." : "إرسال"}
      </button>
      {status === "error" && (
        <p className="text-xs text-gold-bright">
          تعذّر إرسال الرسالة. حاول مرة أخرى، أو راسلنا مباشرة على {toEmail}
        </p>
      )}
    </form>
  );
}
