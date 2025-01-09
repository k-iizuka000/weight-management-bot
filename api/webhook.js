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

// Webhookハンドラー
const webhookHandler = async (req, res) => {
  if (!config.channelAccessToken || !config.channelSecret) {
    console.error('環境変数が設定されていません');
    res.status(500).json({
      status: 'error',
      message: 'Internal Server Error'
    });
    return;
  }

  try {
    const events = req.body.events;
    console.log('受信したイベント:', events);

    const results = await Promise.all(
      events.map(async (event) => {
        try {
          return await handleEvent(event);
        } catch (err) {
          console.error('イベント処理中にエラー:', err);
          return null;
        }
      })
    );

    res.status(200).json(results);
  } catch (err) {
    console.error('Webhookハンドラーでエラー:', err);
    res.status(500).json({
      status: 'error',
      message: 'Internal Server Error'
    });
  }
};

// イベントハンドラー
async function handleEvent(event) {
  console.log('イベントを処理中:', event);

  if (event.type !== 'message' || event.message.type !== 'text') {
    console.log('テキストメッセージ以外のイベントをスキップ');
    return null;
  }

  const userId = event.source.userId;
  const text = event.message.text;

  console.log(`ユーザー ${userId} からのメッセージ:`, text);

  try {
    // 元の体重の登録
    if (text.startsWith('元の体重：')) {
      const weight = parseFloat(text.replace('元の体重：', ''));
      if (!isNaN(weight)) {
        if (!userWeightData[userId]) {
          userWeightData[userId] = {};
        }
        userWeightData[userId].initialWeight = weight;
        console.log(`ユーザー ${userId} の元の体重を登録:`, weight);
        return await client.replyMessage(event.replyToken, {
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
        console.log(`ユーザー ${userId} の目標体重を登録:`, weight);
        return await client.replyMessage(event.replyToken, {
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
          console.log(`ユーザー ${userId} の初期データが未設定`);
          return await client.replyMessage(event.replyToken, {
            type: 'text',
            text: '先に元の体重と目標体重を登録してね！'
          });
        }

        // 進捗率の計算
        const progress = ((userData.initialWeight - currentWeight) / 
                         (userData.initialWeight - userData.targetWeight)) * 100;
        
        // 進捗率を小数点第1位で四捨五入
        const roundedProgress = Math.round(progress * 10) / 10;

        console.log(`ユーザー ${userId} の進捗率を計算:`, roundedProgress);
        return await client.replyMessage(event.replyToken, {
          type: 'text',
          text: `進捗率は${roundedProgress}%だよ！`
        });
      }
    }

    // その他のメッセージの場合
    console.log(`ユーザー ${userId} から未知のメッセージを受信`);
    // return await client.replyMessage(event.replyToken, {
    //   type: 'text',
    //   text: '「元の体重：」「目標体重：」「今日の体重：」の形式でメッセージを送ってね！'
    // });

  } catch (error) {
    console.error('メッセージ処理中にエラー:', error);
    return await client.replyMessage(event.replyToken, {
      type: 'text',
      text: 'すみません、エラーが発生しました。もう一度試してください。'
    });
  }
}

// Vercelのサーバーレス関数用のエクスポート
module.exports = (req, res) => {
  // POSTリクエストの場合はWebhookハンドラーを実行
  if (req.method === 'POST') {
    return webhookHandler(req, res);
  }
  
  // GETリクエストの場合は簡単な応答を返す
  if (req.method === 'GET') {
    return res.status(200).send('Line Bot is running!');
  }
  
  // その他のメソッドは405を返す
  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
};
