import nodemailer from "nodemailer";

type OrderItemForEmail = {
  itemName: string;
  unit: string;
  quantity: number;
  price: number | null;
};

type OrderForEmail = {
  id: string;
  note: string | null;
  createdAt: Date;
};

type SendResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
};

function transportFromEnv() {
  const host = process.env.SMTP_HOST;
  const portRaw = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !portRaw) return null;
  const port = Number(portRaw);
  if (!Number.isFinite(port)) return null;
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });
}

function formatBody(order: OrderForEmail, items: OrderItemForEmail[]): string {
  const lines = [
    `下記のとおり発注いたします。`,
    ``,
    `発注ID: ${order.id}`,
    `発注日時: ${order.createdAt.toLocaleString("ja-JP")}`,
    ``,
    `--- 発注内容 ---`,
  ];
  for (const it of items) {
    const priceLabel =
      it.price !== null ? ` ¥${(it.price * it.quantity).toLocaleString()}` : "";
    lines.push(`・${it.itemName}: ${it.quantity}${it.unit}${priceLabel}`);
  }
  if (order.note) {
    lines.push(``, `備考: ${order.note}`);
  }
  lines.push(``, `-- PecoStock より自動送信 --`);
  return lines.join("\n");
}

export async function sendOrderEmail(
  order: OrderForEmail,
  items: OrderItemForEmail[],
  toEmail: string,
): Promise<SendResult> {
  if (!toEmail) {
    return { ok: false, skipped: true, reason: "no recipient" };
  }
  const transport = transportFromEnv();
  if (!transport) {
    console.info("[email] SMTP not configured — skipping send");
    return { ok: false, skipped: true, reason: "smtp not configured" };
  }
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "noreply@example.com";
  try {
    await transport.sendMail({
      from,
      to: toEmail,
      subject: `【PecoStock】発注書 ${order.id}`,
      text: formatBody(order, items),
    });
    return { ok: true };
  } catch (error) {
    console.warn("[email] send failed", error);
    return { ok: false, reason: error instanceof Error ? error.message : "unknown" };
  }
}
