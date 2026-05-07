type SlackItem = {
  id: string;
  name: string;
  unit: string;
  category: string;
};

async function postToSlack(text: string, blocks?: unknown): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) {
    console.info("[slack] SLACK_WEBHOOK_URL not set — skipping notification");
    return;
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(blocks ? { text, blocks } : { text }),
    });
    if (!res.ok) {
      console.warn("[slack] webhook returned", res.status, await res.text());
    }
  } catch (error) {
    console.warn("[slack] failed to post", error);
  }
}

export async function sendReorderAlert(
  item: SlackItem,
  currentStock: number,
  reorderPoint: number,
): Promise<void> {
  const text = `:package: 発注点アラート: ${item.name} (現在庫 ${currentStock}${item.unit} / 発注点 ${reorderPoint}${item.unit})`;
  await postToSlack(text, [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*:package: 発注点アラート*\n*${item.name}* の在庫が発注点を下回りました。`,
      },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*現在庫*\n${currentStock} ${item.unit}` },
        { type: "mrkdwn", text: `*発注点*\n${reorderPoint} ${item.unit}` },
      ],
    },
  ]);
}

export async function sendExpiryAlert(
  item: SlackItem,
  expiryDate: Date,
  daysLeft: number,
): Promise<void> {
  const dateLabel = expiryDate.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const text = `:warning: 有効期限アラート: ${item.name} は ${dateLabel} (残${daysLeft}日)`;
  await postToSlack(text, [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*:warning: 有効期限アラート*\n*${item.name}* の有効期限が近づいています。`,
      },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*有効期限*\n${dateLabel}` },
        { type: "mrkdwn", text: `*残日数*\n${daysLeft}日` },
      ],
    },
  ]);
}
