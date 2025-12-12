import fetch from 'node-fetch';

const webhook = process.env.SLACK_WEBHOOK_URL;

export async function notifyScoringComplete(payload: {
  requestId: string;
  startupName: string;
  overallScore: number;
  pass: boolean;
  confidence: number;
  summary: string;
}) {
  if (!webhook) return;

  const message = {
    text: `New investment scored: ${payload.startupName}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '📊 Investment Scored'
        }
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Startup:*\n${payload.startupName}` },
          { type: 'mrkdwn', text: `*Score:*\n${payload.overallScore}` },
          { type: 'mrkdwn', text: `*Pass:*\n${payload.pass ? '✅ Yes' : '❌ No'}` },
          { type: 'mrkdwn', text: `*Confidence:*\n${payload.confidence}` }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Summary:*\n${payload.summary}`
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Request ID: \`${payload.requestId}\``
          }
        ]
      }
    ]
  };

  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
  } catch (err) {
    console.error('Slack notification failed:', err);
  }
}
