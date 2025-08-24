// 留言管理模組
class Comments {
    constructor() {
        this.currentPage = 1;
        this.postIdFilter = '';
        this.includeHidden = false;
    }

    // 載入留言列表
    async load(page = 1, postId = '', includeHidden = false) {
        try {
            this.currentPage = page;
            this.postIdFilter = postId;
            this.includeHidden = includeHidden;
            
            const params = new URLSearchParams({
                page: page.toString(),
                includeHidden: includeHidden.toString()
            });
            
            if (postId) params.append('postId', postId);
            
            const data = await window.adminCommon.apiRequest(`/admin/comments?${params}`);
            this.render(data);
        } catch (error) {
            console.error('載入留言失敗:', error);
            window.adminCommon.showError('載入留言失敗: ' + error.message);
        }
    }

    // 渲染留言列表
    render(data) {
        const commentsBody = document.querySelector('#commentsTable tbody');
        if (!commentsBody) return;

        commentsBody.innerHTML = data.comments.map(comment => `
            <tr style="${comment.isHidden ? 'opacity: 0.6; background: #fff3cd;' : ''}">
                <td>
                    ${comment.author.nickname}
                    ${comment.authorIP ? `<div class="ip-info">IP: ${comment.authorIP}</div>` : ''}
                </td>
                <td>
                    ${comment.postId}
                    ${comment.title ? `<div class="ip-info">標題: ${window.adminCommon.truncateText(comment.title, 30)}</div>` : ''}
                </td>
                <td class="text-truncate" title="${comment.content}">
                    ${window.adminCommon.truncateText(comment.content, 100)}
                </td>
                <td>${comment.rating || '-'}</td>
                <td>
                    <div class="timestamp">${window.adminCommon.formatDate(comment.createdAt)}</div>
                    ${comment.updatedAt && comment.updatedAt !== comment.createdAt ? 
                        `<div class="ip-info">編輯: ${window.adminCommon.formatDate(comment.updatedAt)}</div>` : ''
                    }
                </td>
                <td>
                    <span class="status-badge ${comment.isHidden ? 'status-inactive' : 'status-active'}">
                        ${comment.isHidden ? '隱藏' : '顯示'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-warning" onclick="window.comments.toggleCommentVisibility('${comment._id}', ${!comment.isHidden})">
                        ${comment.isHidden ? '顯示' : '隱藏'}
                    </button>
                    <button class="btn btn-danger" onclick="window.comments.deleteComment('${comment._id}')">刪除</button>
                    ${comment.authorIP ? 
                        `<button class="btn btn-secondary" onclick="window.comments.showCommentDetails('${comment._id}')">詳情</button>` : ''
                    }
                </td>
            </tr>
        `).join('');
        
        // 更新分頁  
        window.adminCommon.updatePagination('commentsPagination', data.pagination, 'window.comments.loadPage');
    }

    // 分頁載入
    loadPage(page) {
        const postIdFilter = document.getElementById('postIdFilter')?.value || '';
        const includeHidden = document.getElementById('includeHidden')?.checked || false;
        this.load(page, postIdFilter, includeHidden);
    }

    // 切換留言可見性
    async toggleCommentVisibility(commentId, isHidden) {
        try {
            await window.adminCommon.apiRequest(`/admin/comments/${commentId}/hide`, {
                method: 'PUT',
                body: JSON.stringify({ isHidden })
            });
            
            this.load(this.currentPage, this.postIdFilter, this.includeHidden);
            
            // 同時更新儀表板（如果正在顯示）
            if (window.dashboard && document.getElementById('dashboard').classList.contains('active')) {
                window.dashboard.load();
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
            
            this.load(this.currentPage, this.postIdFilter, this.includeHidden);
            
            // 同時更新儀表板（如果正在顯示）
            if (window.dashboard && document.getElementById('dashboard').classList.contains('active')) {
                window.dashboard.load();
            }
        } catch (error) {
            alert('操作失敗: ' + error.message);
        }
    }

    // 顯示留言詳情
    showCommentDetails(commentId) {
        // 可以實現一個模態框來顯示留言的完整信息
        // 包括完整內容、IP信息、用戶代理等
        alert('留言詳情功能待實現');
    }

    // 將IP加入黑名單
    async addIPToBlacklist(ip, reason) {
        try {
            await window.adminCommon.apiRequest('/admin/ip-blacklist', {
                method: 'POST',
                body: JSON.stringify({
                    ip: ip,
                    type: 'exact',
                    reason: reason || '從留言管理中加入'
                })
            });
            alert('IP已加入黑名單');
        } catch (error) {
            alert('加入黑名單失敗: ' + error.message);
        }
    }

    // 批量操作
    async bulkHideComments(commentIds) {
        try {
            for (const commentId of commentIds) {
                await window.adminCommon.apiRequest(`/admin/comments/${commentId}/hide`, {
                    method: 'PUT',
                    body: JSON.stringify({ isHidden: true })
                });
            }
            this.load(this.currentPage, this.postIdFilter, this.includeHidden);
        } catch (error) {
            alert('批量操作失敗: ' + error.message);
        }
    }

    // 初始化事件監聽器
    setupEventListeners() {
        const postIdFilter = document.getElementById('postIdFilter');
        if (postIdFilter) {
            postIdFilter.addEventListener('input', (e) => {
                this.load(1, e.target.value, this.includeHidden);
            });
        }

        const includeHidden = document.getElementById('includeHidden');
        if (includeHidden) {
            includeHidden.addEventListener('change', (e) => {
                this.load(1, this.postIdFilter, e.target.checked);
            });
        }
    }

    // 初始化
    init() {
        this.setupEventListeners();
    }
}

// 全域實例
window.comments = new Comments();

// DOM 載入完成後初始化
document.addEventListener('DOMContentLoaded', () => {
    window.comments.init();
});