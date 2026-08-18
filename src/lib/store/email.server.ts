// ---------------------------------------------------------------------------
// Digital store — outbound customer email.
//
// Sending runs through Lovable's managed email API, which requires a verified
// sender domain for this project. Until that domain is configured the helper
// reports `email_not_configured` honestly instead of pretending to deliver;
// callers surface the download link on screen either way.
//
// When the domain is verified the template registry is scaffolded at
// src/lib/email-templates/ and this module dispatches through it.
// ---------------------------------------------------------------------------

export type EmailResult = { sent: boolean; reason?: string };

type Sender = (
  template: string,
  to: string,
  options: { templateData?: Record<string, unknown>; idempotencyKey?: string },
) => Promise<{ sent: boolean; reason?: string }>;

async function loadSender(): Promise<Sender | null> {
  try {
    const mod = await import("@/lib/email-templates/send-email");
    return (mod.sendTemplateEmail as unknown as Sender) ?? null;
  } catch (error) {
    console.error("[email] sender module unavailable:", error);
    return null;
  }
}


async function send(
  template: string,
  to: string,
  templateData: Record<string, unknown>,
  idempotencyKey: string,
): Promise<EmailResult> {
  const { logDelivery } = await import("@/lib/notify/deliveries.server");
  const audit = (status: "sent" | "skipped" | "failed", reason?: string) =>
    logDelivery({
      channel: "email",
      template,
      recipient: to,
      status,
      reason: reason ?? null,
      idempotencyKey,
    });

  const sender = await loadSender();
  if (!sender) {
    console.warn(`[email] '${template}' not sent to ${to}: sender domain not configured yet`);
    await audit("skipped", "email_not_configured");
    return { sent: false, reason: "email_not_configured" };
  }
  try {
    const result = await sender(template, to, { templateData, idempotencyKey });
    const sent = Boolean(result?.sent);
    await audit(sent ? "sent" : "skipped", result?.reason);
    return { sent, reason: result?.reason };
  } catch (error) {
    console.error(`[email] '${template}' failed for ${to}:`, error);
    await audit("failed", error instanceof Error ? error.message.slice(0, 300) : "send_failed");
    return { sent: false, reason: "send_failed" };
  }
}

export function sendOrderDownloadEmail(input: {
  to: string;
  firstName?: string | null;
  productTitle: string;
  orderNumber: string;
  downloadUrl: string;
  accountUrl: string;
}): Promise<EmailResult> {
  return send(
    "order-download",
    input.to,
    {
      firstName: input.firstName ?? null,
      productTitle: input.productTitle,
      orderNumber: input.orderNumber,
      downloadUrl: input.downloadUrl,
      accountUrl: input.accountUrl,
    },
    `order-download-${input.orderNumber}`,
  );
}

export function sendEstimateEmail(input: {
  to: string;
  firstName?: string | null;
  amountLabel: string;
  quoteNumber: string;
  quoteUrl: string;
  accountUrl: string;
}): Promise<EmailResult> {
  return send(
    "moving-estimate",
    input.to,
    {
      firstName: input.firstName ?? null,
      amountLabel: input.amountLabel,
      quoteNumber: input.quoteNumber,
      quoteUrl: input.quoteUrl,
      accountUrl: input.accountUrl,
    },
    `moving-estimate-${input.quoteNumber}`,
  );
}
