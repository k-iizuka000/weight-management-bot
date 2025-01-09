// VercelのServerless Functionは CommonJS/ESModule どちらでもOK。
// ここでは CommonJS 形式で書きます。
const { Client } = require('@line/bot-sdk');

// 環境変数からトークンやシークレットを取得（Vercelのダッシュボードで設定を推奨）
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN, 
  channelSecret: process.env.CHANNEL_SECRET
};

const client = new Client(config);

module.exports = async (req, res) => {
  console.log('Access Token:', process.env.CHANNEL_ACCESS_TOKEN);
  console.log('Secret:', process.env.CHANNEL_SECRET);
  // HTTPメソッドのチェック（LINEのWebhookはPOST）
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  // ここで署名検証したい場合は実装（今回は省略）

  // LINEイベント（配列）
  const events = req.body.events || [];

  // イベントごとに返信するPromiseを格納
  const promises = events.map(async (event) => {
    // テキストメッセージ以外は無視
    if (event.type === 'message' && event.message.type === 'text') {
      // replyMessageで「こんにちは」と返す
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'こんにちは'
      });
    }
  });

  // すべての返信処理を完了させてからステータス返す
  await Promise.all(promises);
  return res.status(200).json({ status: 'ok' });
};
