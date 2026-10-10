import { NextRequest, NextResponse } from "next/server";

// Resend is a transactional-email API meant to be called from a server
// (unlike Web3Forms, which expects the request to come straight from a
// browser and blocks server IPs unless you get them individually approved).
// The API key is read here, on the server only, from a non-NEXT_PUBLIC_ env
// var — so it is never bundled into client JS and never reaches the browser.
const API_KEY = process.env.RESEND_API_KEY ?? "";

// Until you verify your own domain in Resend, you must send "from" this
// sandbox address, and you can only deliver "to" the email you signed up
// to Resend with. That's fine here since every message goes to the same
// site-owner inbox anyway. If you later verify a domain, switch FROM to
// something like "contact@yourdomain.com".
const FROM = "زَادُ المُسْلِم <onboarding@resend.dev>";

export async function POST(req: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({ success: false, error: "not_configured" }, { status: 503 });
  }

  let body: { name?: string; email?: string; message?: string; toEmail?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "invalid_body" }, { status: 400 });
  }

  const message = (body.message ?? "").trim();
  if (!message) {
    return NextResponse.json({ success: false, error: "empty_message" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim();
  const toEmail = (body.toEmail ?? "").trim();

  if (!toEmail) {
    return NextResponse.json({ success: false, error: "missing_recipient" }, { status: 400 });
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM,
        to: [toEmail],
        reply_to: email || undefined,
        subject: `رسالة جديدة من موقع زَادُ المُسْلِم — ${name || "بدون اسم"}`,
        text: `الاسم: ${name || "بدون اسم"}\nالإيميل: ${email || "لم يُذكر"}\n\n${message}`,
      }),
    });

    if (res.ok) {
      return NextResponse.json({ success: true });
    }
    // Surface the provider's error message in server logs for debugging,
    // without leaking it to the client.
    const errText = await res.text().catch(() => "");
    console.error("Resend error", res.status, errText);
    return NextResponse.json({ success: false, error: "resend_error" }, { status: 502 });
  } catch (err) {
    console.error("Resend network error", err);
    return NextResponse.json({ success: false, error: "network_error" }, { status: 502 });
  }
}
