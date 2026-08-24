const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

// 圖文選單設定 (2x3 = 6個按鈕)
const RICH_MENU_CONFIG = {
  size: { width: 2500, height: 1680 },
  selected: true,
  name: 'stop-class-menu-v2',
  chatBarText: '功能選單',
  areas: [
    // 上排 (3個)
    { bounds: { x: 0, y: 0, width: 833, height: 840 }, action: { type: 'message', text: '查全台' } },
    { bounds: { x: 833, y: 0, width: 834, height: 840 }, action: { type: 'message', text: '查我訂閱' } },
    { bounds: { x: 1667, y: 0, width: 833, height: 840 }, action: { type: 'message', text: '我的設定' } },
    // 下排 (3個)
    { bounds: { x: 0, y: 840, width: 833, height: 840 }, action: { type: 'message', text: '訂閱 全台' } },
    { bounds: { x: 833, y: 840, width: 834, height: 840 }, action: { type: 'message', text: '取消訂閱 全台' } },
    { bounds: { x: 1667, y: 840, width: 833, height: 840 }, action: { type: 'message', text: '說明' } },
  ]
};

function generateRichMenuImage() {
  const canvas = createCanvas(2500, 1680);
  const ctx = canvas.getContext('2d');

  // 背景
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, 2500, 1680);

  // 分隔線
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(833, 0); ctx.lineTo(833, 1680);
  ctx.moveTo(1667, 0); ctx.lineTo(1667, 1680);
  ctx.moveTo(0, 840); ctx.lineTo(2500, 840);
  ctx.stroke();

  const buttons = [
    { x: 416, y: 420, icon: '🗺️', text: '查全台', color: '#38BDF8' },
    { x: 1250, y: 420, icon: '📌', text: '查我訂閱', color: '#A78BFA' },
    { x: 2083, y: 420, icon: '⚙️', text: '我的設定', color: '#FBBF24' },
    { x: 416, y: 1260, icon: '➕', text: '訂閱全台', color: '#34D399' },
    { x: 1250, y: 1260, icon: '➖', text: '取消訂閱', color: '#F87171' },
    { x: 2083, y: 1260, icon: '❓', text: '使用說明', color: '#60A5FA' },
  ];

  buttons.forEach(btn => {
    ctx.font = '110px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.icon, btn.x, btn.y - 80);

    ctx.font = 'bold 68px "Microsoft JhengHei", "PingFang TC", sans-serif';
    ctx.fillStyle = btn.color;
    ctx.fillText(btn.text, btn.x, btn.y + 80);
  });

  ctx.font = 'bold 48px "Microsoft JhengHei", "PingFang TC", sans-serif';
  ctx.fillStyle = '#64748B';
  ctx.textAlign = 'center';
  ctx.fillText('⚡ 停班停課小幫手 - 功能選單', 1250, 1620);

  return canvas.toBuffer('image/png');
}

async function main() {
  if (!CHANNEL_ACCESS_TOKEN) {
    console.error('❌ 請設定 LINE_CHANNEL_ACCESS_TOKEN');
    process.exit(1);
  }

  const headers = { 'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}` };

  // 1. 刪除舊的
  console.log('🗑️ 刪除舊選單...');
  const listRes = await fetch('https://api.line.me/v2/bot/richmenu/list', { headers });
  const listData = await listRes.json();
  for (const menu of listData.richmenus || []) {
    await fetch(`https://api.line.me/v2/bot/richmenu/${menu.richMenuId}`, { method: 'DELETE', headers });
    console.log(`   已刪除: ${menu.richMenuId}`);
  }

  // 2. 建立新選單
  console.log('📋 建立新選單...');
  const createRes = await fetch('https://api.line.me/v2/bot/richmenu', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(RICH_MENU_CONFIG),
  });
  const createData = await createRes.json();
  const richMenuId = createData.richMenuId;
  console.log(`   ID: ${richMenuId}`);

  // 3. 產生並上傳圖片
  console.log('🖼️ 產生圖片...');
  const imageBuffer = generateRichMenuImage();
  fs.writeFileSync(path.join(__dirname, 'richmenu.png'), imageBuffer);

  console.log('📤 上傳圖片...');
  await fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'image/png' },
    body: imageBuffer,
  });

  // 4. 設為預設
  console.log('⭐ 設為預設選單...');
  await fetch(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, {
    method: 'POST',
    headers,
  });

  console.log('\n✅ 圖文選單建立完成！');
  console.log('按鈕功能：');
  console.log('  查全台 → 發送「查全台」');
  console.log('  查我訂閱 → 發送「查我訂閱」');
  console.log('  我的設定 → 發送「我的設定」');
  console.log('  訂閱雙北 → 發送「訂閱 臺北市 新北市」');
  console.log('  取消訂閱 → 發送「取消訂閱 臺北市 新北市」');
  console.log('  使用說明 → 發送「說明」');
}

main();
