# Hugo 部落格留言與評分系統

一個完整的 Hugo 部落格留言與評分系統，使用 Node.js + MongoDB 開發，支援用戶註冊、登入、留言回覆、文章評分、頭像上傳等功能，並提供完整的管理後台。

## 🚀 主要功能

### 用戶功能
- ✅ **用戶註冊與登入** - 安全的 JWT 認證系統
- ✅ **個人檔案管理** - 修改暱稱、上傳頭像
- ✅ **文章評分** - 1-5 星評分系統
- ✅ **留言功能** - 發表留言與回覆（支援標題）
- ✅ **討論串回覆** - 支援多層次回覆
- ✅ **頭像顯示** - 小尺寸頭像儲存在 MongoDB

### 管理功能  
- ✅ **管理後台** - 完整的網頁管理界面
- ✅ **用戶管理** - 查看、啟用/停用用戶
- ✅ **權限控制** - 細粒度權限管理（留言/評分/發文）
- ✅ **內容管理** - 隱藏/刪除留言
- ✅ **IP 黑名單** - 支援精確、子網路、範圍封鎖
- ✅ **IP 追踪** - 記錄用戶登入和留言 IP
- ✅ **統計資料** - 用戶、留言、評分統計

### 技術特色
- ✅ **響應式設計** - 支援各種裝置
- ✅ **安全性** - 防護措施與輸入驗證
- ✅ **IP 管理** - 完整的 IP 黑名單與追踪系統
- ✅ **效能優化** - 分頁載入與快取機制
- ✅ **易於擴展** - 模組化架構設計

## 📁 專案架構

```
hugo-comment-system/
├── server.js                 # 主伺服器檔案
├── package.json              # 依賴管理
├── .env.example              # 環境變數範例
├── models/                   # 資料庫模型
│   ├── User.js              #   用戶模型
│   ├── Comment.js           #   留言模型
│   └── PostRating.js        #   評分模型
├── routes/                   # API 路由
│   ├── auth.js              #   認證相關
│   ├── comments.js          #   留言相關
│   ├── users.js             #   用戶管理
│   └── admin.js             #   管理功能
├── middleware/               # 中間件
│   └── auth.js              #   認證中間件
├── public/                   # 靜態檔案
│   └── admin.html           #   管理後台頁面
├── uploads/                  # 檔案上傳目錄
└── hugo-components/          # Hugo 組件
    ├── comments.html        #   留言組件
    ├── shortcodes/          #   Hugo shortcodes
    ├── config-example.yaml  #   設定範例
    └── usage-example.md     #   使用說明
```

## 🛠 安裝與設定

### 1. 系統需求

- Node.js 16+ 
- MongoDB 4.4+
- Hugo 0.80+

### 2. 安裝依賴

```bash
npm install
```

### 3. 設定環境變數

複製 `.env.example` 為 `.env` 並修改設定：

```bash
cp .env.example .env
```

編輯 `.env`：

```env
# 基本設定
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/hugo-comments

# JWT 認證
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# 管理員帳號（首次啟動時建立）
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123

# CORS 設定
CORS_ORIGIN=http://localhost:1313

# 頭像上傳設定
MAX_AVATAR_SIZE=100000  # 最大檔案大小 (bytes)
AVATAR_QUALITY=80       # JPEG 壓縮品質 (1-100)
```

### 4. 啟動 MongoDB

確保 MongoDB 服務正在運行：

```bash
# Windows
net start MongoDB

# macOS/Linux
sudo systemctl start mongod
```

### 5. 啟動應用

```bash
# 開發模式
npm run dev

# 生產模式
npm start
```

### 6. 建立管理員帳號

首次啟動後，使用 `.env` 中設定的 `ADMIN_EMAIL` 和 `ADMIN_PASSWORD` 登入管理後台。

**重要頁面：**
- 管理後台：http://localhost:3000/admin
- **功能測試頁**：http://localhost:3000/test.html

### 7. 功能測試

訪問測試頁面進行完整功能測試：http://localhost:3000/test.html

**測試頁面功能：**
- ✅ **系統狀態檢查** - API 連線測試
- ✅ **用戶認證測試** - 註冊、登入、登出
- ✅ **個人檔案管理** - 暱稱修改、頭像上傳、密碼修改
- ✅ **留言與評分** - 發表留言（支援標題）、評分、回覆
- ✅ **管理功能測試** - 後台管理、用戶管理、留言管理
- ✅ **即時 API 日誌** - 查看所有請求和回應詳情

**測試建議：**
1. 先檢查 API 狀態
2. 註冊測試用戶
3. 測試頭像上傳（支援 JPG/PNG，最大 100KB）
4. 發表帶標題的留言
5. 測試管理員功能

## 🎯 Hugo 整合

### 1. 複製組件檔案

將 `hugo-components/comments.html` 複製到你的 Hugo 主題的 `layouts/partials/` 目錄：

```bash
cp hugo-components/comments.html /path/to/your/hugo/themes/your-theme/layouts/partials/
```

### 2. 設定 Hugo

在 `config.yaml` 中加入：

```yaml
params:
  commentSystem:
    enabled: true
    apiUrl: "http://localhost:3000/api"  # 開發環境
    # apiUrl: "https://your-domain.com/api"  # 生產環境
```

### 3. 在文章模板中使用

編輯 `layouts/_default/single.html`：

```html
<article>
    {{ .Content }}
    
    <!-- 加入留言系統 -->
    {{ if .Site.Params.commentSystem.enabled }}
        {{ partial "comments.html" . }}
    {{ end }}
</article>
```

### 4. 或使用 Shortcode

複製 shortcode 到 Hugo：

```bash
cp -r hugo-components/shortcodes/* /path/to/your/hugo/layouts/shortcodes/
```

然後在 Markdown 文章中使用：

```markdown
{{< comments >}}
```

## 🔧 API 端點

### 認證相關
- `POST /api/auth/register` - 用戶註冊
- `POST /api/auth/login` - 用戶登入  
- `GET /api/auth/me` - 取得目前用戶資訊
- `POST /api/auth/refresh` - 刷新 JWT token

### 留言相關
- `GET /api/comments/post/:postId` - 取得文章留言
- `POST /api/comments/post/:postId` - 發表留言
- `PUT /api/comments/:commentId` - 編輯留言
- `DELETE /api/comments/:commentId` - 刪除留言
- `POST /api/comments/rate/:postId` - 評分文章
- `GET /api/comments/rating/:postId/user` - 取得用戶評分

### 用戶管理
- `GET /api/users/profile` - 取得個人檔案
- `PUT /api/users/profile` - 更新個人檔案
- `POST /api/users/avatar` - 上傳頭像
- `DELETE /api/users/avatar` - 刪除頭像
- `GET /api/users/avatar/:userId` - 取得用戶頭像

### 管理後台
- `GET /api/admin/dashboard` - 管理面板資訊
- `GET /api/admin/users` - 用戶列表
- `PUT /api/admin/users/:userId/status` - 啟用/停用用戶
- `PUT /api/admin/users/:userId/permissions` - 編輯用戶權限
- `GET /api/admin/comments` - 留言列表（含 IP 資訊）
- `PUT /api/admin/comments/:commentId/hide` - 隱藏/顯示留言
- `DELETE /api/admin/comments/:commentId` - 刪除留言
- `GET /api/admin/stats` - 統計資料

### IP 黑名單管理
- `GET /api/admin/ip-blacklist` - 取得 IP 黑名單列表
- `POST /api/admin/ip-blacklist` - 新增 IP 到黑名單
- `PUT /api/admin/ip-blacklist/:id/toggle` - 啟用/停用黑名單項目
- `DELETE /api/admin/ip-blacklist/:id` - 刪除黑名單項目
- `POST /api/admin/check-ip` - 檢查 IP 是否被封鎖

## 🎨 自訂樣式

你可以覆寫預設 CSS 來自訂外觀：

```css
/* 自訂留言系統樣式 */
.comment-system {
    font-family: 'Your Custom Font';
    max-width: 900px;
}

.comment {
    border-left: 3px solid #your-color;
    background: #your-background;
}

.star-rating .star.active {
    color: #your-star-color;
}
```

## 🔒 安全性功能

- **JWT 認證** - 安全的 token 認證系統
- **密碼雜湊** - bcryptjs 加密儲存
- **輸入驗證** - express-validator 檢查輸入
- **速率限制** - 防止 API 濫用
- **CORS 設定** - 跨域請求控制
- **Helmet 安全標頭** - HTTP 安全標頭
- **檔案上傳限制** - 頭像大小與格式限制

## 🖼 頭像上傳功能

### 頭像規格與限制
- **支援格式**: JPG, PNG, GIF, WebP 等常見圖片格式
- **檔案大小**: 最大 100KB (100,000 bytes)
- **處理流程**: 自動壓縮至 64x64 像素
- **儲存方式**: Base64 編碼存入 MongoDB
- **品質設定**: JPEG 品質 80%（可在 .env 中調整）

### 頭像上傳流程
1. **前端驗證**: 檢查檔案類型和大小
2. **後端處理**: 使用 Sharp 庫處理圖片
   - 調整尺寸至 64x64 像素
   - 轉換為 JPEG 格式
   - 壓縮品質至 80%
3. **資料儲存**: Base64 格式存入 MongoDB
4. **顯示機制**: 前端透過 data URL 或 API 端點顯示

### 頭像 API 使用方式
```javascript
// 上傳頭像
const formData = new FormData();
formData.append('avatar', file);

const response = await fetch('/api/users/avatar', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token },
    body: formData
});

// 取得頭像
// 方法1: 直接使用 API 端點
<img src="/api/users/avatar/USER_ID" alt="頭像" />

// 方法2: 從用戶檔案取得 Base64
const profile = await fetch('/api/users/profile');
if (profile.user.avatar) {
    // profile.user.avatar 已經是完整的 data URL
    document.getElementById('avatar').src = profile.user.avatar;
}
```

### 效能考量
- **小尺寸**: 64x64 像素確保快速載入
- **壓縮處理**: 品質 80% 平衡檔案大小與清晰度  
- **快取機制**: 前端可快取頭像資料
- **儲存優化**: MongoDB 的 Binary 欄位儲存

## 🌐 IP 管理系統

### IP 記錄功能
- **登入追踪**: 記錄用戶最近 3 次不同 IP 登入
- **留言 IP**: 每則留言都記錄發表者 IP（僅管理員可見）
- **IP 統計**: 顯示 IP 登入次數和最後登入時間

### IP 黑名單類型
1. **精確匹配** (`exact`): 封鎖特定 IP 位址
   - 範例: `192.168.1.100`
2. **子網路封鎖** (`subnet`): 使用 CIDR 表示法
   - 範例: `192.168.1.0/24` (封鎖整個 C 類網段)
3. **範圍封鎖** (`range`): 封鎖 IP 範圍
   - 範例: `192.168.1.1-192.168.1.50`

### 黑名單功能
- **即時檢查**: 每次請求都檢查 IP 是否被封鎖
- **過期時間**: 支援設定黑名單過期時間
- **封鎖原因**: 可記錄封鎖原因供管理參考
- **管理界面**: 透過後台輕鬆管理黑名單

## 📊 權限系統

### 用戶權限
- `canComment`: 是否可以留言
- `canRate`: 是否可以評分
- `canPost`: 是否可以發文

### 用戶狀態
- `isActive`: 帳號是否啟用
- `role`: 用戶角色 (user/admin)

### IP 相關權限
管理員可透過後台細化控制每個用戶的權限，並查看：
- 用戶登入 IP 歷史
- 留言發表的 IP 位址
- 設定 IP 黑名單封鎖

## 🚀 部署指南

### 開發環境
1. 按照上述安裝步驟設定
2. 使用 `npm run dev` 啟動
3. Hugo 使用 `hugo server -D`

### 生產環境

#### 1. 伺服器設定
```bash
# 安裝 PM2 管理程序
npm install -g pm2

# 啟動應用
pm2 start server.js --name "hugo-comments"

# 設定開機自動啟動
pm2 startup
pm2 save
```

#### 2. Nginx 代理設定
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Hugo 靜態網站
    location / {
        root /path/to/your/hugo/public;
        try_files $uri $uri/ =404;
    }

    # API 代理
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 管理後台
    location /admin {
        proxy_pass http://localhost:3000;
    }
}
```

#### 3. SSL 設定
```bash
# 使用 Certbot 申請免費 SSL
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

#### 4. 環境變數
更新生產環境 `.env`：
```env
NODE_ENV=production
MONGODB_URI=mongodb://localhost:27017/hugo-comments-prod
CORS_ORIGIN=https://your-domain.com
```

## 📝 使用範例

### 基本使用
```html
<!-- 在 Hugo 模板中 -->
{{ partial "comments.html" . }}
```

### 進階自訂
```html
<!-- 自訂 CSS 類別 -->
<div class="my-custom-comments">
    {{ partial "comments.html" . }}
</div>

<style>
.my-custom-comments .comment-system {
    border: 1px solid #ddd;
    border-radius: 10px;
    padding: 2rem;
}
</style>
```

## 🛠 開發與擴展

### 新增功能
1. 建立新的路由檔案
2. 定義資料庫模型
3. 實作 API 端點
4. 更新前端組件

### 測試
```bash
# 運行測試 (需要先實作測試檔案)
npm test
```

### 除錯
開啟除錯模式：
```bash
DEBUG=* npm run dev
```

## ⚠️ 注意事項

1. **資料庫備份**: 定期備份 MongoDB 資料
2. **頭像儲存**: 考慮大量用戶時的儲存空間
3. **效能優化**: 大量留言時考慮實作快取
4. **安全性**: 定期更新依賴套件
5. **監控**: 建議使用監控工具追蹤系統狀況

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

## 📄 授權

MIT License

## 💡 後續規劃

- [ ] 留言通知功能
- [ ] 社群登入 (Google, Facebook)
- [ ] 留言匯出功能
- [ ] 多語言支援
- [ ] 留言搜尋功能
- [ ] 檔案附件支援
- [ ] 留言舉報功能
- [ ] API 快取機制
- [ ] 資料庫遷移工具
- [ ] Docker 化部署

---

如有問題或需要協助，請查看文件或建立 Issue。