/* =========================================================
   Gulnish Crochet — order confirmation email (Vercel function)

   Sends an "Order received" receipt to the customer's email via
   Resend (https://resend.com). Works for static/Edge deployments
   with NO extra framework: dropping files in /api makes Vercel
   treat them as Node serverless functions.

   Env vars (add in Vercel dashboard):
     RESEND_API_KEY  — required to actually send
     EMAIL_FROM      — verified sender, e.g. "Gulnish Crochet <orders@gulnishcrochet.com>"
     EMAIL_NOTIFY_TO — (optional) store address that gets CC'd on every receipt

   If RESEND_API_KEY is missing the endpoint returns ok:false,
   disabled:true, so the storefront keeps working untouched.
   ========================================================= */

const RESEND = "https://api.resend.com/emails";

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function money(v) {
  const n = parseFloat(v) || 0;
  return "Rs. " + n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function emailBody(order) {
  const c = order.customer || {};
  const items = order.items || [];
  const total = money(order.total || 0);

  const lines = [
    "Hi " + (c.name || "there") + ",",
    "",
    "Thank you for your order with Gulnish Crochet. We've received it and will confirm delivery and payment with you on WhatsApp shortly.",
    "",
    "Order number: " + order.id,
    "",
    "Items:"
  ];

  items.forEach(function (i) {
    lines.push("- " + (i.name || "Item") +
      (i.color ? " (" + i.color + ")" : "") +
      " x " + i.qty + " = " + money((i.price || 0) * i.qty));
  });

  lines.push("");
  lines.push("Total: " + total);
  lines.push("Payment: " + ((order.payment && order.payment.method) || "Cash on delivery"));
  if (order.estDelivery) {
    try {
      lines.push("Estimated delivery: " + new Date(order.estDelivery).toDateString());
    } catch (e) { /* ignore */ }
  }
  lines.push("");
  lines.push("For updates on your order, message us on WhatsApp at +92 307 5729901.");
  lines.push("");
  lines.push("Questions? WhatsApp us at +92 307 5729901.");

  const rowHtml = "  <h2>Order " + escapeHtml(order.id) + "</h2>\n" +
    "  <table width=\"100%\" cellpadding=\"6\" cellspacing=\"0\" style=\"border-collapse:collapse\">\n" +
    items.map(function (i) {
      return "    <tr><td>" + escapeHtml(i.name) +
        (i.color ? " <em>(" + escapeHtml(i.color) + ")</em>" : "") +
        "</td><td align=\"right\">x " + i.qty + " &middot; " + money((i.price || 0) * i.qty) + "</td></tr>";
    }).join("\n") +
    "\n  </table>\n" +
    "  <p><strong>Total: " + money(order.total || 0) + "</strong><br>" +
    "Payment: " + escapeHtml((order.payment && order.payment.method) || "Cash on delivery") + "</p>\n" +
    "  <p style=\"color:#68706b;font-size:13px\">Track it from the My Orders page on our site, or WhatsApp us at +92 307 5729901.</p>";

  return {
    subject: "Order received " + order.id + " — Gulnish Crochet",
    text: lines.join("\n"),
    html:
      '<div style="font-family:Georgia,serif;max-width:560px;margin:auto;color:#1b211d">' +
      '<h1 style="color:#a87e2c">Gulnish Crochet</h1>' +
      '<p>Hi ' + escapeHtml(c.name || "there") + ',</p>' +
      '<p>Thank you for your order! We\'ve received it and will confirm delivery and payment with you on WhatsApp shortly.</p>' +
      rowHtml +
      '</div>'
  };
}

async function sendViaResend(from, to, cc, subject, text, html) {
  const payload = {
    from: from,
    to: [to],
    subject: subject,
    text: text,
    html: html
  };
  if (cc) payload.cc = [cc];
  const res = await fetch(RESEND, {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + process.env.RESEND_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const body = await res.json().catch(function () { return {}; });
  if (!res.ok) {
    return { ok: false, status: res.status, error: body && body.message ? body.message : "Resend error" };
  }
  return { ok: true, id: body && body.id };
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    return res.status(200).json({ ok: true, service: "send-order-email" });
  }
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  let payload;
  try {
    payload = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    return res.status(400).json({ ok: false, error: "Invalid JSON" });
  }

  const to = String(payload.to || "").trim();
  const order = payload.order;
  if (!to || !order || !order.id || !Array.isArray(order.items)) {
    return res.status(400).json({ ok: false, error: "Missing to/order" });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return res.status(400).json({ ok: false, error: "Invalid email address" });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(200).json({ ok: false, disabled: true, error: "Email sending not configured" });
  }

  const from = process.env.EMAIL_FROM || "Gulnish Crochet <onboarding@resend.dev>";
  const cc = process.env.EMAIL_NOTIFY_TO || "";
  const body = emailBody(order);

  const result = await sendViaResend(from, to, cc, body.subject, body.text, body.html);

  if (!result.ok) {
    return res.status(result.status === 200 ? 500 : result.status).json(result);
  }
  return res.status(200).json({ ok: true, id: result.id });
};