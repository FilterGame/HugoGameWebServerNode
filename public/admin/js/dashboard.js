// 儀表板模組
class Dashboard {
    constructor() {
        this.data = null;
    }

    // 載入儀表板數據
    async load() {
        try {
            this.data = await window.adminCommon.apiRequest('/admin/dashboard');
            this.render();
        } catch (error) {
            console.error('載入儀表板失敗:', error);
            window.adminCommon.showError('載入儀表板失敗: ' + error.message);
        }
    }

    // 渲染儀表板
    render() {
        if (!this.data) return;

        this.renderStats();
        this.renderRecentUsers();
        this.renderRecentComments();
    }

    // 渲染統計卡片
    renderStats() {
        const statsGrid = document.getElementById('statsGrid');
        if (!statsGrid) return;

        statsGrid.innerHTML = `
            <div class="stat-card">
                <div class="stat-number">${this.data.stats.totalUsers}</div>
                <div class="stat-label">總用戶數</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${this.data.stats.activeUsers}</div>
                <div class="stat-label">活躍用戶</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${this.data.stats.totalComments}</div>
                <div class="stat-label">總留言數</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${this.data.stats.totalRatings}</div>
                <div class="stat-label">總評分數</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${this.data.stats.hiddenComments || 0}</div>
                <div class="stat-label">隱藏留言</div>
            </div>
        `;
    }

    // 渲染最新用戶表
    renderRecentUsers() {
        const recentUsersBody = document.querySelector('#recentUsersTable tbody');
        if (!recentUsersBody) return;

        recentUsersBody.innerHTML = this.data.recentUsers.map(user => `
            <tr>
                <td>${user.nickname}</td>
                <td>${user.email}</td>
                <td>${window.adminCommon.formatDate(user.createdAt)}</td>
                <td>
                    <span class="status-badge ${user.isActive ? 'status-active' : 'status-inactive'}">
                        ${user.isActive ? '活躍' : '停用'}
                    </span>
                    ${user.emailVerified !== undefined ? 
                        `<span class="status-badge ${user.emailVerified ? 'status-active' : 'status-inactive'}">
                            ${user.emailVerified ? '已驗證' : '未驗證'}
                        </span>` : ''
                    }
                </td>
            </tr>
        `).join('');
    }

    // 渲染最新留言表
    renderRecentComments() {
        const recentCommentsBody = document.querySelector('#recentCommentsTable tbody');
        if (!recentCommentsBody) return;

        recentCommentsBody.innerHTML = this.data.recentComments.map(comment => `
            <tr>
                <td>
                    ${comment.author.nickname}
                    ${comment.authorIP ? `<div class="ip-info">IP: ${comment.authorIP}</div>` : ''}
                </td>
                <td>
                    ${comment.title ? `<strong>${window.adminCommon.truncateText(comment.title, 50)}</strong><br>` : ''}
                    ${window.adminCommon.truncateText(comment.content, 80)}
                </td>
                <td>
                    ${window.adminCommon.formatDate(comment.createdAt)}
                    ${comment.postId ? `<div class="ip-info">文章: ${comment.postId}</div>` : ''}
                </td>
                <td>
                    <button class="btn btn-warning" onclick="window.dashboard.toggleCommentVisibility('${comment._id}', ${!comment.isHidden})">
                        ${comment.isHidden ? '顯示' : '隱藏'}
                    </button>
                    <button class="btn btn-danger" onclick="window.dashboard.deleteComment('${comment._id}')">刪除</button>
                </td>
            </tr>
        `).join('');
    }

    // 切換留言可見性
    async toggleCommentVisibility(commentId, isHidden) {
        try {
            await window.adminCommon.apiRequest(`/admin/comments/${commentId}/hide`, {
                method: 'PUT',
                body: JSON.stringify({ isHidden })
            });
            
            // 重新載入儀表板和留言頁面（如果在留言頁面）
            this.load();
            if (window.comments && document.getElementById('comments').classList.contains('active')) {
                window.comments.load();
            }
        } catch (error) {
            alert('操作失敗: ' + error.message);
        }
    }

    // 刪除留言
    async deleteComment(commentId) {
        if (!confirm('確定要刪除這個留言嗎？此操作無法復原。')) {
            return;
        }
        
        try {
            await window.adminCommon.apiRequest(`/admin/comments/${commentId}`, {
                method: 'DELETE'
            });
            
            // 重新載入儀表板和留言頁面（如果在留言頁面）
            this.load();
            if (window.comments && document.getElementById('comments').classList.contains('active')) {
                window.comments.load();
            }
        } catch (error) {
            alert('操作失敗: ' + error.message);
        }
    }

    // 初始化（首次載入）
    init() {
        this.load();
    }
}

// 全域實例
window.dashboard = new Dashboard();