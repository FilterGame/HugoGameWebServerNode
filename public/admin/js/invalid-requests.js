// 無效請求管理模組
class InvalidRequests {
    constructor() {
        this.currentPage = 1;
        this.ipFilter = '';
        this.stats = null;
    }

    // 載入無效請求列表
    async load(page = 1, ip = '') {
        try {
            this.currentPage = page;
            this.ipFilter = ip;
            
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '20'
            });
            
            if (ip) params.append('ip', ip);
            
            const [requestsData, statsData] = await Promise.all([
                window.adminCommon.apiRequest(`/admin/invalid-requests?${params}`),
                window.adminCommon.apiRequest('/admin/invalid-requests/stats')
            ]);
            
            this.stats = statsData;
            this.render(requestsData);
            this.renderStats();
        } catch (error) {
            console.error('載入無效請求失敗:', error);
            window.adminCommon.showError('載入無效請求失敗: ' + error.message);
        }
    }

    // 渲染統計信息
    renderStats() {
        const statsGrid = document.getElementById('invalidRequestsStats');
        if (!statsGrid || !this.stats) return;

        statsGrid.innerHTML = `
            <div class="stat-card">
                <div class="stat-number">${this.stats.totalRequests}</div>
                <div class="stat-label">總無效請求</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${this.stats.recentRequests}</div>
                <div class="stat-label">最近1小時</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${this.stats.dailyRequests}</div>
                <div class="stat-label">最近24小時</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${this.stats.topIPs.length}</div>
                <div class="stat-label">異常IP數量</div>
            </div>
        `;

        // 顯示狀態碼統計
        const statusStats = document.getElementById('statusCodeStats');
        if (statusStats && this.stats.statusCodeStats) {
            statusStats.innerHTML = `
                <h5>狀態碼分佈：</h5>
                <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                    ${Object.entries(this.stats.statusCodeStats).map(([code, count]) => 
                        `<span class="status-badge ${this.getStatusBadgeClass(code)}">${code}: ${count}</span>`
                    ).join('')}
                </div>
            `;
        }

        // 顯示最頻繁的IP
        const topIPs = document.getElementById('topMaliciousIPs');
        if (topIPs && this.stats.topIPs) {
            topIPs.innerHTML = `
                <h5>最頻繁的異常IP（前10）：</h5>
                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>IP地址</th>
                                <th>請求次數</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.stats.topIPs.slice(0, 10).map(item => `
                                <tr>
                                    <td><code>${item.ip}</code></td>
                                    <td>${item.count}</td>
                                    <td>
                                        <button class="btn btn-primary btn-sm" onclick="window.invalidRequests.filterByIP('${item.ip}')">
                                            查看詳情
                                        </button>
                                        <button class="btn btn-danger btn-sm" onclick="window.invalidRequests.blockIP('${item.ip}')">
                                            加入黑名單
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
    }

    // 獲取狀態碼標籤樣式
    getStatusBadgeClass(statusCode) {
        const code = parseInt(statusCode);
        if (code >= 400 && code < 500) return 'status-inactive'; // 4xx 客戶端錯誤
        if (code >= 500) return 'status-blocked'; // 5xx 伺服器錯誤
        return 'status-active';
    }

    // 渲染無效請求列表
    render(data) {
        const requestsBody = document.querySelector('#invalidRequestsTable tbody');
        if (!requestsBody) return;

        requestsBody.innerHTML = data.requests.map(request => `
            <tr>
                <td>
                    <code>${request.ip}</code>
                    <div class="ip-info">
                        ${request.headers?.host ? `Host: ${request.headers.host}` : ''}
                    </div>
                </td>
                <td>
                    <strong>${request.method} ${request.url}</strong>
                    <div class="request-details">
                        UA: ${window.adminCommon.truncateText(request.userAgent, 50)}
                    </div>
                    ${request.body ? `<div class="request-details">Body: ${window.adminCommon.truncateText(request.body, 50)}</div>` : ''}
                </td>
                <td>
                    <span class="status-badge ${this.getStatusBadgeClass(request.statusCode)}">
                        ${request.statusCode}
                    </span>
                </td>
                <td>
                    <div class="error-details">${window.adminCommon.truncateText(request.error, 100)}</div>
                </td>
                <td>
                    <div class="timestamp">${window.adminCommon.formatDate(request.timestamp)}</div>
                </td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="window.invalidRequests.blockIP('${request.ip}')">
                        封鎖IP
                    </button>
                    <button class="btn btn-warning btn-sm" onclick="window.invalidRequests.removeRequest(${request.id})">
                        移除
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="window.invalidRequests.showRequestDetails(${request.id})">
                        詳情
                    </button>
                </td>
            </tr>
        `).join('');
        
        // 更新分頁
        window.adminCommon.updatePagination('invalidRequestsPagination', data.pagination, 'window.invalidRequests.loadPage');
    }

    // 分頁載入
    loadPage(page) {
        this.load(page, this.ipFilter);
    }

    // 按IP過濾
    filterByIP(ip) {
        document.getElementById('ipFilter').value = ip;
        this.load(1, ip);
    }

    // 將IP加入黑名單
    async blockIP(ip) {
        const reason = prompt(`確定要將IP ${ip} 加入黑名單嗎？\n請輸入封鎖原因：`, '來自無效請求的異常IP');
        
        if (reason === null) return; // 用戶取消

        try {
            await window.adminCommon.apiRequest('/admin/invalid-requests/blacklist-ip', {
                method: 'POST',
                body: JSON.stringify({
                    ip: ip,
                    reason: reason,
                    type: 'exact'
                })
            });

            alert(`IP ${ip} 已成功加入黑名單`);
            
            // 重新載入數據
            this.load(this.currentPage, this.ipFilter);
        } catch (error) {
            alert('加入黑名單失敗: ' + error.message);
        }
    }

    // 移除單個請求記錄
    async removeRequest(requestId) {
        if (!confirm('確定要移除這個請求記錄嗎？')) {
            return;
        }

        try {
            await window.adminCommon.apiRequest(`/admin/invalid-requests/${requestId}`, {
                method: 'DELETE'
            });
            
            this.load(this.currentPage, this.ipFilter);
        } catch (error) {
            alert('移除失敗: ' + error.message);
        }
    }

    // 清空所有記錄
    async clearAllRequests() {
        if (!confirm('確定要清空所有無效請求記錄嗎？此操作無法復原。')) {
            return;
        }

        try {
            await window.adminCommon.apiRequest('/admin/invalid-requests/clear', {
                method: 'DELETE'
            });
            
            alert('所有無效請求記錄已清空');
            this.load(1);
        } catch (error) {
            alert('清空失敗: ' + error.message);
        }
    }

    // 顯示請求詳情
    showRequestDetails(requestId) {
        // 可以實現一個模態框來顯示完整的請求信息
        // 包括完整的headers, body, error stack trace等
        alert('請求詳情功能待實現');
    }

    // 匯出無效請求記錄
    async exportRequests() {
        try {
            const data = await window.adminCommon.apiRequest('/admin/invalid-requests?limit=1000');
            
            const csvContent = [
                'IP地址,請求方法,請求URL,狀態碼,錯誤信息,用戶代理,時間戳',
                ...data.requests.map(request => [
                    request.ip,
                    request.method,
                    request.url,
                    request.statusCode,
                    (request.error || '').replace(/,/g, '；'),
                    (request.userAgent || '').replace(/,/g, '；'),
                    window.adminCommon.formatDate(request.timestamp)
                ].join(','))
            ].join('\n');

            const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `invalid-requests-${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
        } catch (error) {
            alert('匯出失敗: ' + error.message);
        }
    }

    // 自動刷新功能
    startAutoRefresh(interval = 30000) { // 30秒
        setInterval(() => {
            if (document.getElementById('invalid-requests').classList.contains('active')) {
                this.load(this.currentPage, this.ipFilter);
            }
        }, interval);
    }

    // 初始化事件監聽器
    setupEventListeners() {
        const ipFilter = document.getElementById('ipFilter');
        if (ipFilter) {
            ipFilter.addEventListener('input', (e) => {
                this.load(1, e.target.value);
            });
        }

        // 清空按鈕
        const clearBtn = document.getElementById('clearAllRequestsBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAllRequests());
        }

        // 匯出按鈕
        const exportBtn = document.getElementById('exportRequestsBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportRequests());
        }

        // 刷新按鈕
        const refreshBtn = document.getElementById('refreshRequestsBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.load(this.currentPage, this.ipFilter));
        }
    }

    // 初始化
    init() {
        this.setupEventListeners();
        this.startAutoRefresh();
    }
}

// 全域實例
window.invalidRequests = new InvalidRequests();

// DOM 載入完成後初始化
document.addEventListener('DOMContentLoaded', () => {
    window.invalidRequests.init();
});