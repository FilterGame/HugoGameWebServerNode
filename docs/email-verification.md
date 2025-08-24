# 電子郵件驗證功能 (Email Verification)

電子郵件驗證功能為 Hugo 遊戲網站提供用戶註冊時的信箱驗證機制，確保用戶提供有效的電子郵件地址才能進行發文和評分操作。

## 功能特色

- ✅ 註冊時自動發送驗證郵件
- ✅ 24小時有效期限，過期需重新發送
- ✅ 驗證前限制發文和評分權限
- ✅ 重新發送驗證郵件功能 (5分鐘冷卻時間)
- ✅ 美觀的郵件模板和驗證頁面
- ✅ 可開啟/關閉功能，方便測試
- ✅ IP頻率限制，防止濫用

## API 端點

### 1. 電子郵件驗證

**GET** `/api/auth/verify-email?token={verificationToken}`

驗證用戶的電子郵件地址

**參數:**
- `token` (query string): 驗證令牌

**回應:**
```json
{
  "success": true,
  "message": "Email verified successfully! You can now post and rate content."
}
```

**錯誤回應:**
```json
{
  "error": "Invalid or expired verification token"
}
```

### 2. 重新發送驗證郵件

**POST** `/api/auth/resend-verification`

為已登入但未驗證的用戶重新發送驗證郵件

**Headers:**
- `Authorization: Bearer {token}`

**頻率限制:** 每5分鐘一次

**回應:**
```json
{
  "success": true,
  "message": "Verification email sent successfully. Please check your email."
}
```

**錯誤回應:**
```json
{
  "error": "Please wait 3 more minutes before requesting another email"
}
```

### 3. 註冊時的變更

**POST** `/api/auth/register`

註冊回應現在包含電子郵件驗證狀態：

```json
{
  "message": "User created successfully. Please check your email to verify your account.",
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "nickname": "用戶暱稱",
    "role": "user",
    "emailVerified": false
  },
  "emailVerificationRequired": true
}
```

### 4. 用戶資訊更新

所有回傳用戶資訊的 API 端點現在都包含 `emailVerified` 欄位：

- `GET /api/auth/me`
- `POST /api/auth/login`

## 環境變數配置

將以下環境變數加入您的 `.env` 檔案：

```env
# === 電子郵件驗證設定 ===
# 是否啟用電子郵件驗證 (true/false)
EMAIL_VERIFICATION_ENABLED=true

# === 郵件服務設定 ===
# SMTP 伺服器設定
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# 寄件者資訊
EMAIL_FROM=your-email@gmail.com
EMAIL_FROM_NAME=Hugo Game Website

# === 郵件內容設定 ===
# 驗證郵件主旨
EMAIL_VERIFICATION_SUBJECT=請驗證您的電子郵件地址

# 網站相關
WEBSITE_NAME=Hugo Game Website
FRONTEND_URL=http://localhost:1313

# === 頻率限制設定 ===
# 重新發送驗證郵件的冷卻時間 (分鐘)
EMAIL_RESEND_COOLDOWN_MINUTES=5
```

## Hugo 配置

### 1. Hugo 網站配置

在您的 Hugo `config.yaml` 中加入：

```yaml
params:
  commentSystem:
    enabled: true
    apiUrl: "http://localhost:3000/api"  # 開發環境
    emailVerificationEnabled: true      # 對應 EMAIL_VERIFICATION_ENABLED
```

### 2. 部署組件檔案

將以下組件檔案複製到您的 Hugo 主題：

```bash
# 複製電子郵件驗證組件
cp hugo-components/email-verification.html /path/to/your/hugo/themes/your-theme/layouts/partials/

# 複製驗證頁面模板 (可選，用於專門的驗證頁面)
cp hugo-components/verify-email-page.html /path/to/your/hugo/themes/your-theme/layouts/
```

### 3. 創建驗證頁面 (可選)

創建 `content/verify-email.md`：

```markdown
---
title: "電子郵件驗證"
layout: "verify-email-page"
---
```

## 前端整合

### 自動整合

電子郵件驗證組件已整合在現有的留言系統中。當用戶登入且尚未驗證電子郵件時，會自動顯示驗證提醒。

### 手動檢查驗證狀態

```javascript
// 檢查用戶是否需要電子郵件驗證
if (window.emailVerificationManager) {
    const needsVerification = window.emailVerificationManager.checkEmailVerificationStatus(user);
    
    if (needsVerification) {
        // 用戶需要驗證電子郵件
        console.log('User needs email verification');
    }
}
```

### 處理 API 錯誤

當 API 回傳電子郵件驗證錯誤時：

```javascript
fetch('/api/comments/post/123', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({ content: 'My comment' })
})
.then(response => response.json())
.then(data => {
    if (data.requiresEmailVerification) {
        // 顯示電子郵件驗證提醒
        window.emailVerificationManager?.showVerificationNotice();
    }
});
```

## 郵件模板自訂

### 修改郵件內容

編輯 `services/emailService.js` 中的 `getVerificationEmailTemplate()` 方法來自訂郵件樣式和內容。

### 環境變數替換

郵件模板支援以下環境變數替換：
- `${process.env.WEBSITE_NAME}` - 網站名稱
- `${process.env.EMAIL_FROM_NAME}` - 寄件者名稱

## 安全考量

### 頻率限制
- 註冊：使用既有的 IP 限制
- 重新發送：5分鐘冷卻時間 + IP限制
- 驗證：無限制，但令牌24小時過期

### 令牌安全
- 使用 crypto.randomBytes(32) 生成 256位隨機令牌
- 令牌僅儲存雜湊值 (實際是明文，可考慮加強)
- 驗證後立即刪除令牌

## 故障排除

### 1. 郵件發送失敗
```bash
# 檢查 logs
npm run dev
# 查看 "Email service configuration error" 或 "Failed to send verification email"
```

常見問題：
- Gmail: 需要使用應用程式密碼，不是帳戶密碼
- SMTP設定錯誤：確認 HOST、PORT、SECURE 設定

### 2. 驗證連結無效
- 檢查 `FRONTEND_URL` 是否正確
- 確認令牌未過期 (24小時)
- 檢查資料庫中的令牌是否存在

### 3. 重新發送功能無法使用
- 確認用戶已登入
- 檢查是否在冷卻期間
- 驗證 IP 是否被封鎖

## 測試步驟

### 1. 功能測試
```bash
# 1. 啟用電子郵件驗證
echo "EMAIL_VERIFICATION_ENABLED=true" >> .env

# 2. 配置 Gmail SMTP
echo "EMAIL_HOST=smtp.gmail.com" >> .env
echo "EMAIL_USER=your-email@gmail.com" >> .env
echo "EMAIL_PASSWORD=your-app-password" >> .env

# 3. 啟動服務
npm run dev

# 4. 註冊新用戶並檢查信箱
```

### 2. 停用測試
```bash
# 停用電子郵件驗證進行開發測試
echo "EMAIL_VERIFICATION_ENABLED=false" >> .env
```

## 進階設定

### 自訂驗證頁面路由

如果您希望使用自訂的驗證頁面路由，請修改：

1. `services/emailService.js` 中的驗證URL
2. Hugo 路由設定
3. 前端 JavaScript 中的重定向邏輯

### 整合其他郵件服務

支援所有 Nodemailer 相容的服務：
- SendGrid
- Mailgun
- Amazon SES
- Outlook/Hotmail

只需修改 `services/emailService.js` 中的 transporter 設定。

## API 狀態碼

| 狀態碼 | 說明 |
|--------|------|
| 200 | 驗證成功 |
| 400 | 請求參數錯誤或令牌無效 |
| 403 | 電子郵件未驗證，禁止操作 |
| 429 | 請求過於頻繁，需等待 |
| 500 | 伺服器內部錯誤 |