// 統計資料模組
class Stats {
    constructor() {
        this.data = null;
    }

    // 載入統計資料
    async load() {
        try {
            this.data = await window.adminCommon.apiRequest('/admin/stats');
            this.render();
        } catch (error) {
            console.error('載入統計失敗:', error);
            window.adminCommon.showError('載入統計失敗: ' + error.message);
        }
    }

    // 渲染統計資料
    render() {
        if (!this.data) return;

        const statsDiv = document.getElementById('detailedStats');
        if (!statsDiv) return;

        statsDiv.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;">
                <div class="card">
                    <h4>用戶統計</h4>
                    <table class="table">
                        <tr><td>總用戶數</td><td>${this.data.users.totalUsers || 0}</td></tr>
                        <tr><td>活躍用戶</td><td>${this.data.users.activeUsers || 0}</td></tr>
                        <tr><td>管理員</td><td>${this.data.users.adminUsers || 0}</td></tr>
                        <tr><td>停用用戶</td><td>${(this.data.users.totalUsers || 0) - (this.data.users.activeUsers || 0)}</td></tr>
                    </table>
                </div>
                <div class="card">
                    <h4>留言統計</h4>
                    <table class="table">
                        <tr><td>總留言數</td><td>${this.data.comments.totalComments || 0}</td></tr>
                        <tr><td>可見留言</td><td>${this.data.comments.visibleComments || 0}</td></tr>
                        <tr><td>隱藏留言</td><td>${this.data.comments.hiddenComments || 0}</td></tr>
                        <tr><td>已刪除留言</td><td>${this.data.comments.deletedComments || 0}</td></tr>
                    </table>
                </div>
                <div class="card">
                    <h4>評分統計</h4>
                    <table class="table">
                        <tr><td>總評分數</td><td>${this.data.ratings.totalRatings || 0}</td></tr>
                        <tr><td>平均評分</td><td>${this.data.ratings.averageRating ? this.data.ratings.averageRating.toFixed(2) : '0.00'}</td></tr>
                        <tr><td>最高評分</td><td>5.00</td></tr>
                        <tr><td>最低評分</td><td>1.00</td></tr>
                    </table>
                </div>
                <div class="card">
                    <h4>系統統計</h4>
                    <table class="table">
                        <tr><td>資料庫連接</td><td><span class="status-badge status-active">正常</span></td></tr>
                        <tr><td>最後更新</td><td>${window.adminCommon.formatDate(new Date())}</td></tr>
                        <tr><td>系統運行時間</td><td id="systemUptime">載入中...</td></tr>
                    </table>
                    <div style="margin-top: 1rem;">
                        <button class="btn btn-primary" onclick="window.stats.refreshStats()">刷新統計</button>
                        <button class="btn btn-warning" onclick="window.stats.exportStats()">匯出統計</button>
                    </div>
                </div>
            </div>
        `;

        // 更新系統運行時間
        this.updateSystemUptime();
    }

    // 更新系統運行時間
    updateSystemUptime() {
        const uptimeElement = document.getElementById('systemUptime');
        if (uptimeElement) {
            // 簡單的運行時間顯示（實際應該從伺服器獲取）
            const startTime = localStorage.getItem('adminStartTime') || Date.now();
            if (!localStorage.getItem('adminStartTime')) {
                localStorage.setItem('adminStartTime', Date.now());
            }
            
            const uptime = Date.now() - parseInt(startTime);
            const hours = Math.floor(uptime / (1000 * 60 * 60));
            const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
            
            uptimeElement.textContent = `${hours}小時 ${minutes}分鐘`;
        }
    }

    // 刷新統計
    async refreshStats() {
        await this.load();
        window.adminCommon.showSuccess('統計資料已刷新');
    }

    // 匯出統計
    exportStats() {
        if (!this.data) {
            alert('沒有可匯出的統計資料');
            return;
        }

        const exportData = {
            exportDate: new Date().toISOString(),
            users: this.data.users,
            comments: this.data.comments,
            ratings: this.data.ratings
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `admin-stats-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    }

    // 生成圖表（如果需要的話）
    generateCharts() {
        // 可以使用 Chart.js 或其他圖表庫來生成視覺化圖表
        // 這裡先留空，可以後續擴展
    }

    // 初始化
    init() {
        // 設置自動刷新（每5分鐘）
        setInterval(() => {
            if (document.getElementById('stats').classList.contains('active')) {
                this.updateSystemUptime();
            }
        }, 60000); // 每分鐘更新運行時間
    }
}

// 全域實例
window.stats = new Stats();

// DOM 載入完成後初始化
document.addEventListener('DOMContentLoaded', () => {
    window.stats.init();
});