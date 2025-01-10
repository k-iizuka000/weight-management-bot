const line = require('@line/bot-sdk');

// LINE Botの設定
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};

// LINE クライアントの作成
const client = new line.Client(config);

// ユーザー名を取得する関数
async function getDisplayName(event) {
  try {
    // グループの場合
    if (event.source.type === 'group') {
      const profile = await client.getGroupMemberProfile(
        event.source.groupId,
        event.source.userId
      );
      return profile.displayName;
    }
    // 個人チャットの場合
    else if (event.source.type === 'user') {
      const profile = await client.getProfile(event.source.userId);
      return profile.displayName;
    }
    // その他の場合（ルームなど）
    else if (event.source.type === 'room') {
      const profile = await client.getRoomMemberProfile(
        event.source.roomId,
        event.source.userId
      );
      return profile.displayName;
    }
    
    return 'ユーザー'; // プロフィール取得に失敗した場合のデフォルト値
  } catch (error) {
    console.error('プロフィール取得エラー:', error);
    return 'ユーザー';
  }
}

// イベントハンドラー
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return null;
  }

  const text = event.message.text;
  console.log(`受信メッセージ: ${text}`);

  try {
    // メッセージを行に分割
    const lines = text.split('\n').map(line => line.trim());
    
    // 数値を含む行を探す（カンマで区切られた3つの数値）
    const weightLine = lines.find(line => {
      const numbers = line.split(',').map(num => parseFloat(num.trim()));
      return numbers.length === 3 && numbers.every(num => !isNaN(num));
    });

    // if (!weightLine) {
    //   return await client.replyMessage(event.replyToken, {
    //     type: 'text',
    //     text: '体重は「初期体重,目標体重,現在体重」の形式で入力してください！\n例：70,60,65'
    //   });
    // }

    // 体重データを解析
    const [initialWeight, targetWeight, currentWeight] = weightLine
      .split(',')
      .map(num => parseFloat(num.trim()));

    // 進捗率の計算
    const progress = ((initialWeight - currentWeight) / 
                     (initialWeight - targetWeight)) * 100;
    
    // 進捗率を小数点第1位で四捨五入
    const roundedProgress = Math.round(progress * 10) / 10;

    // ユーザー名を取得
    const displayName = await getDisplayName(event);

    // 結果を返信
    return await client.replyMessage(event.replyToken, {
      type: 'text',
      text: `${displayName}さんの進捗率は${roundedProgress}%だよ！`
    });

  } catch (error) {
    // console.error('エラーが発生しました:', error);
    // return await client.replyMessage(event.replyToken, {
    //   type: 'text',
    //   text: 'すみません、エラーが発生しました。もう一度試してください。'
    // });
  }
}

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

// Vercelのサーバーレス関数用のエクスポート
module.exports = (req, res) => {
  if (req.method === 'POST') {
    return webhookHandler(req, res);
  }
  
  if (req.method === 'GET') {
    return res.status(200).send('Line Bot is running!');
  }
  
  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
};