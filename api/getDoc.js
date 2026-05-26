/**
 * 佐賀市空き家相談チャットボット
 * Vercel Serverless Function - RAG型ドキュメント取得
 *
 * 環境変数（Vercel管理画面で設定）:
 *   GAS_URL          : GASデプロイURL
 *   DOC_ID_COMMON    : 共通資料のGoogle Docs ID
 *   DOC_ID_CAT_A     : カテゴリA（解体・管理）のGoogle Docs ID
 *   DOC_ID_CAT_B     : カテゴリB（売却・買取）のGoogle Docs ID
 *   DOC_ID_CAT_C     : カテゴリC（相続・名義）のGoogle Docs ID
 *   DOC_ID_CAT_D     : カテゴリD（リフォーム・活用）のGoogle Docs ID
 *   DOC_ID_CAT_E     : カテゴリE（荷物・遺品）のGoogle Docs ID
 */

const DOC_IDS = {
  common: process.env.DOC_ID_COMMON,
  a: process.env.DOC_ID_CAT_A,
  b: process.env.DOC_ID_CAT_B,
  c: process.env.DOC_ID_CAT_C,
  d: process.env.DOC_ID_CAT_D,
  e: process.env.DOC_ID_CAT_E,
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // URLからcategoryパラメータを取得
  const { searchParams } = new URL(req.url, `https://${req.headers.host}`);
  const category = searchParams.get('category') || 'common';
  const docId = DOC_IDS[category];

  if (!docId) {
    return res.status(400).json({ error: `カテゴリ "${category}" のドキュメントIDが設定されていません` });
  }

  const gasUrl = process.env.GAS_URL;
  if (!gasUrl) return res.status(500).json({ error: 'GAS_URLが設定されていません' });

  try {
    const response = await fetch(`${gasUrl}?action=getDoc&docId=${encodeURIComponent(docId)}`);
    if (!response.ok) {
      return res.status(response.status).json({ error: `GASへのアクセスに失敗しました (${response.status})` });
    }
    const text = await response.text();
    if (!text || text.startsWith('データの読み込みに失敗')) {
      return res.status(500).json({ error: text || 'データの取得に失敗しました' });
    }
    return res.status(200).send(text);
  } catch (err) {
    console.error('getDoc.js error:', err);
    return res.status(500).json({ error: err.message || '予期しないエラーが発生しました' });
  }
}
