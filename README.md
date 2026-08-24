# ⚡ 停班停課小幫手 - LINE 即時通知機器人

即時整合行政院人事行政總處 (DGPA) 停班停課公開資料的 LINE 自動推播機器人，支援自訂訂閱縣市、提醒時間與推播頻率。

## 🌟 功能特色

- 🔴 **即時異動推播** - 人事行政總處一發布，1 分鐘內自動推播
- 📍 **22 縣市覆蓋** - 全台灣各縣市停班停課狀態
- 🔔 **多種通知模式** - 即時推播、每日定時、僅停班課通知
- 📌 **自訂訂閱縣市** - 自由選擇關注的地區
- 🗺️ **全台總覽** - 一覽所有縣市狀態
- 🌐 **圖文選單** - LINE 底部快捷按鈕
- ⚙️ **管理後台** - 網頁版管理面板

## 🚀 快速開始

### 1. 加入 LINE 好友

搜尋 LINE 好友 ID：`@190azbzx`

或掃描 QR Code 加入。

### 2. 使用指令

| 指令 | 功能 |
|------|------|
| `查全台` | 查看全台灣 22 縣市狀態 |
| `台北市` | 查詢特定縣市 |
| `訂閱 全台` | 訂閱所有縣市 |
| `訂閱 台北市 新北市` | 訂閱指定縣市 |
| `取消訂閱 全台` | 取消所有訂閱 |
| `設定時間 07:00` | 設定每日推播時間 |
| `即時推播` | 切換為即時通知模式 |
| `僅停班課通知` | 只在停班課時通知 |
| `我的設定` | 查看個人設定 |

## 🛠️ 技術架構

- **前端**：React + Vite + Tailwind CSS
- **後端**：Cloudflare Workers (Hono)
- **儲存**：Cloudflare KV
- **資料來源**：NCDR 災害防救科技中心 RSS
- **推播**：LINE Messaging API

## 📦 自己架設

### 前置需求

- Node.js 18+
- Cloudflare 帳號
- LINE Developers 帳號

### 安裝步驟

```bash
# 1. Clone 專案
git clone https://github.com/pengjun0429/-Suspension-of-work-and-classes.git
cd -Suspension-of-work-and-classes

# 2. 安裝套件
npm install

# 3. 建立 .env 檔案
cp .env.example .env

# 4. 建立 Cloudflare KV
npx wrangler kv namespace create KV

# 5. 更新 wrangler.jsonc 中的 KV ID

# 6. 部署到 Cloudflare
npx wrangler deploy

# 7. 設定 Secrets
npx wrangler secret put LINE_CHANNEL_ACCESS_TOKEN
npx wrangler secret put LINE_CHANNEL_SECRET
npx wrangler secret put ADMIN_PASSWORD
```

### LINE 設定

1. 前往 [LINE Developers](https://developers.line.biz/)
2. 建立 Messaging API Channel
3. 設定 Webhook URL：`https://你的網址/api/line/webhook`
4. 開啟 Use Webhook

## 📁 專案結構

```
├── src/
│   ├── worker/           # Cloudflare Worker 後端
│   │   ├── index.ts      # 主入口與 API 路由
│   │   ├── storage.ts    # KV 儲存服務
│   │   ├── dgpaData.ts   # DGPA 資料擷取
│   │   └── lineBotService.ts  # LINE Bot 服務
│   ├── components/       # React 前端元件
│   └── types.ts          # TypeScript 型別定義
├── scripts/
│   └── create-richmenu.cjs  # 圖文選單建立腳本
├── wrangler.jsonc        # Cloudflare Workers 設定
└── package.json
```

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

## 📄 授權條款

本專案使用 [MIT 授權條款](LICENSE)。

## 🔗 相關連結

- [行政院人事行政總處](https://www.dgpa.gov.tw/)
- [政府資料開放平台](https://data.gov.tw/dataset/20457)
- [LINE Developers](https://developers.line.biz/)
- [Cloudflare Workers](https://workers.cloudflare.com/)
