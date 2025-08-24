# 電子郵件驗證設置指南

## 問題解決方案

您遇到的 "page not found" 問題已經解決。現在驗證連結會指向您的 Hugo 網站首頁，並自動顯示驗證結果。

## 1. 快速設置步驟

### 複製組件到您的 Hugo 主題

```bash
# 複製電子郵件驗證組件
cp hugo-components/email-verification.html /path/to/your/hugo/themes/your-theme/layouts/partials/
```

### 在您的 Hugo 佈局中包含組件

**方法一：在基礎模板中全域包含**
編輯 `layouts/_default/baseof.html` 或 `layouts/partials/footer.html`：

```html
{{ partial "email-verification.html" . }}
```

**方法二：在特定頁面包含**
編輯 `layouts/index.html` (首頁模板)：

```html
{{ define "main" }}
<!-- 您的首頁內容 -->

<!-- 加入電子郵件驗證組件 -->
{{ partial "email-verification.html" . }}
{{ end }}
```

## 2. 驗證流程

現在的驗證流程如下：

1. **註冊後收到驗證郵件**
   - 郵件中的連結格式：`http://localhost:1313/?verify_token=TOKEN`

2. **點擊驗證連結**
   - 會打開您的 Hugo 網站首頁
   - 自動彈出驗證模態框
   - 顯示驗證進度

3. **驗證結果**
   - **成功**：顯示綠色成功畫面，5秒後自動跳轉回首頁
   - **失敗**：顯示紅色錯誤畫面，5秒後自動跳轉回首頁
   - 用戶也可以點擊"返回首頁"按鈕立即跳轉

## 3. 測試步驟

### 測試驗證功能：

1. **重啟後端服務**
   ```bash
   npm run dev
   ```

2. **註冊新用戶**
   - 前往 http://localhost:1313
   - 註冊新帳號

3. **檢查郵件**
   - 新的驗證連結格式：`http://localhost:1313/?verify_token=...`

4. **點擊驗證連結**
   - 應該會打開首頁
   - 自動彈出驗證模態框
   - 看到驗證成功或失敗的結果
   - 倒數5秒後自動跳轉

## 4. 自訂選項

### 修改倒數時間
在 `email-verification.html` 中修改：
```javascript
let countdown = 5; // 改成您想要的秒數
```

### 修改跳轉目標
在 `startRedirectCountdown()` 方法中修改：
```javascript
window.location.href = '/'; // 跳轉到根目錄
// 或
window.location.href = '/dashboard'; // 跳轉到特定頁面
```

### 停用自動跳轉
註釋掉自動跳轉代碼，只保留手動按鈕：
```javascript
// if (countdown <= 0) {
//     window.location.href = window.location.pathname;
// }
```

## 5. 故障排除

### 如果驗證模態框沒有出現：

1. **檢查 console 錯誤**
   - 按 F12 打開開發者工具
   - 查看 Console 標籤是否有錯誤

2. **確認組件已包含**
   - 檢查頁面原始碼是否包含 `email-verification-component`

3. **檢查 API URL**
   - 確認 `config.yaml` 中的 `apiUrl` 設定正確

### 如果驗證 API 調用失敗：

1. **檢查後端服務**
   ```bash
   curl http://localhost:3000/api/auth/verify-email?token=test
   ```

2. **檢查 CORS 設定**
   - 確認 `.env` 中的 `CORS_ORIGIN` 設定正確

## 6. Hugo 配置檢查

確認您的 `config.yaml` 包含：

```yaml
params:
  commentSystem:
    enabled: true
    apiUrl: "http://localhost:3000/api"
    emailVerificationEnabled: true
```

## 7. 完整的測試流程

1. **設定環境變數** (已經在 `.env` 中)
2. **啟動後端服務** (`npm run dev`)
3. **啟動 Hugo** (`hugo server -D`)
4. **複製電子郵件驗證組件到 Hugo 主題**
5. **在 Hugo 模板中包含組件**
6. **註冊新用戶並測試驗證流程**

現在點擊驗證郵件中的連結應該可以正常工作，並且會在您的網站上顯示美觀的驗證結果！