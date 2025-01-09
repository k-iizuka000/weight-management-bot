const line = require('@line/bot-sdk');
const express = require('express');

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const app = express();
const client = new line.Client(config);

app.post('/webhook', line.middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then(result => res.json(result))
    .catch(err => res.status(500).end());
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const message = event.message.text;
  const userId = event.source.userId;

  // 「今日の体重：」を受信
  if (message.startsWith('今日の体重：')) {
    const currentWeight = parseFloat(message.replace('今日の体重：', '').trim());
    
    // アナウンスからデータを取得（擬似的な例）
    const groupSummary = await client.getGroupSummary(event.source.groupId);
    const announcements = parseGroupAnnouncements(groupSummary);

    // ユーザーを検索して進捗計算
    const user = announcements.find(ann => ann.userId === userId);
    if (!user) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '登録情報が見つからないよ！アナウンスを確認してね。',
      });
    }

    const progress = ((user.originalWeight - currentWeight) / 
                      (user.originalWeight - user.goalWeight)) * 100;

    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `${user.name}さんの進捗率は：${progress.toFixed(2)}%だよ！`,
    });
  }

  return Promise.resolve(null);
}

// 擬似的にアナウンス内容を解析
function parseGroupAnnouncements(groupSummary) {
  const announcementsText = groupSummary.description; // 仮: グループ概要から取得
  const lines = announcementsText.split('\n');
  const users = lines.map(line => {
    const match = line.match(/- (.+): 元の体重 (\d+)kg, 目標体重 (\d+)kg/);
    if (match) {
      return {
        name: match[1],
        originalWeight: parseFloat(match[2]),
        goalWeight: parseFloat(match[3]),
      };
    }
    return null;
  }).filter(user => user !== null);
  return users;
}

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
