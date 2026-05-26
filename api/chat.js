/**
 * 佐賀市空き家相談チャットボット
 * Vercel Serverless Function - RAG型 Chat API
 *
 * 環境変数（Vercel管理画面で設定）:
 *   ANTHROPIC_API_KEY : AnthropicのAPIキー
 */

const MODEL = 'claude-sonnet-4-20250514';

function buildSystemPrompt(commonDoc, categoryDoc) {
  const categorySection = categoryDoc
    ? `\n\n■ 詳細参照データ（今回の質問に関連するカテゴリ）\n${categoryDoc}`
    : '';

  return `あなたは「佐賀市空き家相談チャットボット」です。
株式会社ソロン（イエステーション加盟店）が運営する、佐賀・久留米エリアの空き家専門AIアシスタントとして、市民の方々の疑問や悩みに親切・丁寧・わかりやすくお答えします。

■ 回答ルール（形式）
・マークダウン記号（#、*など）は一切使用しない
・箇条書きは「・」を使う
・一度の返答は300文字以内を目安にする
・長い説明は「続きをお聞きになりますか？」と確認してから続ける

■ 回答ルール（内容）
・提供されたドキュメントの情報を優先して回答する
・ドキュメントに記載のない情報は「詳しくは佐賀市にお問い合わせください」と伝える
・金額・期限・条件は「変更になる場合があります」と補足する
・法律・税務・登記の具体的な手続きは「専門家への相談をおすすめします」と添える

■ 態度・トーン
・親しみやすく、丁寧に
・ユーザーが困っている様子のときはまず共感してから案内する
・回答の最後に「ほかにご質問はありますか？😊」など次の一言を添える

■ 共通参照データ
${commonDoc || 'データを読み込み中です。'}${categorySection}`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages, commonDoc, categoryDoc } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages is required' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'APIキーが設定されていません' });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: buildSystemPrompt(commonDoc, categoryDoc),
        messages: messages
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: err.error?.message || `APIエラー (${response.status})`
      });
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || '（回答を取得できませんでした）';
    return res.status(200).json({ reply });

  } catch (err) {
    console.error('chat.js error:', err);
    return res.status(500).json({ error: err.message || '予期しないエラーが発生しました' });
  }
}
