const line = require('@line/bot-sdk');
const express = require('express');

// LINE Botの設定
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};

// メモリ内でユーザーデータを保持するオブジェクト
const userWeightData = {};

// Express アプリケーションの作成
const app = express();

// LINE クライアントの作成
const client = new line.Client(config);

// Webhookのエンドポイント
app.post('/webhook', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// イベントハンドラー
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userId = event.source.userId;
  const text = event.message.text;

  // 元の体重の登録
  if (text.startsWith('元の体重：')) {
    const weight = parseFloat(text.replace('元の体重：', ''));
    if (!isNaN(weight)) {
      if (!userWeightData[userId]) {
        userWeightData[userId] = {};
      }
      userWeightData[userId].initialWeight = weight;
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: `元の体重を${weight}kgで登録したよ！`
      });
    }
  }

  // 目標体重の登録
  if (text.startsWith('目標体重：')) {
    const weight = parseFloat(text.replace('目標体重：', ''));
    if (!isNaN(weight)) {
      if (!userWeightData[userId]) {
        userWeightData[userId] = {};
      }
      userWeightData[userId].targetWeight = weight;
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: `目標体重を${weight}kgで登録したよ！`
      });
    }
  }

  // 今日の体重の記録と進捗計算
  if (text.startsWith('今日の体重：')) {
    const currentWeight = parseFloat(text.replace('今日の体重：', ''));
    if (!isNaN(currentWeight)) {
      const userData = userWeightData[userId];
      
      if (!userData || !userData.initialWeight || !userData.targetWeight) {
        return client.replyMessage(event.replyToken, {
          type: 'text',
          text: '先に元の体重と目標体重を登録してね！'
        });
      }

      // 進捗率の計算
      const progress = ((userData.initialWeight - currentWeight) / 
                       (userData.initialWeight - userData.targetWeight)) * 100;
      
      // 進捗率を小数点第1位で四捨五入
      const roundedProgress = Math.round(progress * 10) / 10;

      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: `進捗率は${roundedProgress}%だよ！`
      });
    }
  }

  // その他のメッセージの場合
  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: '「元の体重：」「目標体重：」「今日の体重：」の形式でメッセージを送ってね！'
  });
}

// サーバーの起動
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
