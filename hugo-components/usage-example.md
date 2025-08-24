---
title: "如何使用留言系統"
date: 2025-01-01
---

# Hugo 留言系統使用範例

## 方法一：直接包含留言組件

在你的 Hugo 模板中（如 `single.html`）加入：

```html
{{ if .Site.Params.commentSystem.enabled }}
    {{ partial "comments.html" . }}
{{ end }}
```

## 方法二：使用 Shortcode

在 Markdown 文章中加入：

```markdown
{{< comments >}}
```

## 方法三：自訂位置

在文章模板的任何位置加入：

```html
<div class="article-comments">
    {{ partial "comments.html" . }}
</div>
```

## 設定說明

在 `config.yaml` 中設定：

```yaml
params:
  commentSystem:
    enabled: true
    apiUrl: "http://localhost:3000/api"  # 開發環境
    # apiUrl: "https://your-domain.com/api"  # 生產環境
```

## 功能特色

- ✅ 用戶註冊與登入
- ✅ 個人檔案管理（暱稱、頭像）
- ✅ 文章評分（1-5星）
- ✅ 留言功能
- ✅ 回覆功能（討論串）
- ✅ 頭像顯示
- ✅ 管理後台
- ✅ 權限管理
- ✅ 響應式設計

## 樣式自訂

你可以覆寫 CSS 類別來自訂樣式：

```css
.comment-system {
    /* 自訂樣式 */
}

.comment {
    /* 留言樣式 */
}
```