// IP黑名單管理模組
class Blacklist {
    constructor() {
        this.currentPage = 1;
    }

    // 載入IP黑名單
    async load(page = 1) {
        try {
            this.currentPage = page;
            const data = await window.adminCommon.apiRequest(`/admin/ip-blacklist?page=${page}`);
            this.render(data);
        } catch (error) {
            console.error('載入IP黑名單失敗:', error);
            window.adminCommon.showError('載入IP黑名單失敗: ' + error.message);
        }
    }

    // 渲染IP黑名單列表
    render(data) {
        const blacklistBody = document.querySelector('#blacklistTable tbody');
        if (!blacklistBody) return;

        blacklistBody.innerHTML = data.blacklist.map(entry => `
            <tr style="${!entry.isActive ? 'opacity: 0.6;' : ''}">
                <td>
                    <code>${entry.ip}</code>
                    <div class="ip-info">類型: ${this.getTypeLabel(entry.type)}</div>
                </td>
                <td>${entry.reason || '-'}</td>
                <td>
                    ${entry.createdBy ? entry.createdBy.nickname : '系統'}
                    <div class="timestamp">${window.adminCommon.formatDate(entry.createdAt)}</div>
                </td>
                <td>
                    ${entry.expiresAt ? 
                        `<div class="timestamp">過期: ${window.adminCommon.formatDate(entry.expiresAt)}</div>` :
                        '<span class="status-badge status-active">永久</span>'
                    }
                </td>
                <td>
                    <span class="status-badge ${entry.isActive ? 'status-active' : 'status-inactive'}">
                        ${entry.isActive ? '啟用' : '停用'}
                    </span>
                </td>
                <td>
                    <button class="btn ${entry.isActive ? 'btn-warning' : 'btn-success'}" 
                            onclick="window.blacklist.toggleEntry('${entry._id}')">
                        ${entry.isActive ? '停用' : '啟用'}
                    </button>
                    <button class="btn btn-danger" onclick="window.blacklist.deleteEntry('${entry._id}')">
                        刪除
                    </button>
                    <button class="btn btn-primary" onclick="window.blacklist.checkIP('${entry.ip}')">
                        測試
                    </button>
                </td>
            </tr>
        `).join('');
        
        // 更新分頁
        window.adminCommon.updatePagination('blacklistPagination', data.pagination, 'window.blacklist.load');
    }

    // 獲取類型標籤
    getTypeLabel(type) {
        const labels = {
            'exact': '精確匹配',
            'subnet': '子網路',
            'range': '範圍'
        };
        return labels[type] || type;
    }

    // 添加IP到黑名單
    async addIP() {
        const ip = document.getElementById('blacklistIP')?.value;
        const type = document.getElementById('blacklistType')?.value;
        const reason = document.getElementById('blacklistReason')?.value;
        const expiresAt = document.getElementById('blacklistExpires')?.value;

        if (!ip || !type) {
            alert('請填寫IP地址和類型');
            return;
        }

        try {
            const payload = { ip, type, reason };
            if (expiresAt) {
                payload.expiresAt = expiresAt;
            }

            await window.adminCommon.apiRequest('/admin/ip-blacklist', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            // 清空表單
            document.getElementById('addBlacklistForm').reset();
            
            // 關閉模態框
            window.adminCommon.closeModal('addBlacklistModal');
            
            // 重新載入列表
            this.load(1);
            
            window.adminCommon.showSuccess('IP已成功加入黑名單');
        } catch (error) {
            alert('加入黑名單失敗: ' + error.message);
        }
    }

    // 切換黑名單項目狀態
    async toggleEntry(entryId) {
        try {
            await window.adminCommon.apiRequest(`/admin/ip-blacklist/${entryId}/toggle`, {
                method: 'PUT'
            });
            this.load(this.currentPage);
        } catch (error) {
            alert('操作失敗: ' + error.message);
        }
    }

    // 刪除黑名單項目
    async deleteEntry(entryId) {
        if (!confirm('確定要刪除這個黑名單項目嗎？')) {
            return;
        }

        try {
            await window.adminCommon.apiRequest(`/admin/ip-blacklist/${entryId}`, {
                method: 'DELETE'
            });
            this.load(this.currentPage);
        } catch (error) {
            alert('刪除失敗: ' + error.message);
        }
    }

    // 測試IP是否被封鎖
    async checkIP(ip) {
        try {
            const result = await window.adminCommon.apiRequest('/admin/check-ip', {
                method: 'POST',
                body: JSON.stringify({ ip })
            });

            let message = `IP: ${ip}\n`;
            message += `狀態: ${result.blocked ? '被封鎖' : '未被封鎖'}\n`;
            
            if (result.blocked && result.entry) {
                message += `封鎖原因: ${result.entry.reason || '未提供'}\n`;
                message += `封鎖類型: ${this.getTypeLabel(result.entry.type)}\n`;
                message += `創建時間: ${window.adminCommon.formatDate(result.entry.createdAt)}`;
            }

            alert(message);
        } catch (error) {
            alert('檢查IP失敗: ' + error.message);
        }
    }

    // 批量導入IP
    async bulkImportIPs() {
        const textarea = document.getElementById('bulkImportIPs');
        const type = document.getElementById('bulkImportType');
        const reason = document.getElementById('bulkImportReason');

        if (!textarea || !type) {
            alert('請填寫必要信息');
            return;
        }

        const ips = textarea.value.split('\n').filter(ip => ip.trim());
        if (ips.length === 0) {
            alert('請輸入要導入的IP地址');
            return;
        }

        let successCount = 0;
        let errorCount = 0;

        for (const ip of ips) {
            try {
                await window.adminCommon.apiRequest('/admin/ip-blacklist', {
                    method: 'POST',
                    body: JSON.stringify({
                        ip: ip.trim(),
                        type: type.value,
                        reason: reason.value || '批量導入'
                    })
                });
                successCount++;
            } catch (error) {
                errorCount++;
                console.error(`添加IP ${ip} 失敗:`, error);
            }
        }

        alert(`導入完成！成功: ${successCount}, 失敗: ${errorCount}`);
        
        // 重新載入列表
        this.load(1);
        
        // 關閉模態框
        window.adminCommon.closeModal('bulkImportModal');
    }

    // 匯出黑名單
    async exportBlacklist() {
        try {
            // 獲取所有黑名單項目（不分頁）
            const data = await window.adminCommon.apiRequest('/admin/ip-blacklist?limit=1000');
            
            const csvContent = [
                'IP地址,類型,原因,創建者,創建時間,過期時間,狀態',
                ...data.blacklist.map(entry => [
                    entry.ip,
                    this.getTypeLabel(entry.type),
                    (entry.reason || '').replace(/,/g, '；'), // 替換逗號避免CSV格式問題
                    entry.createdBy ? entry.createdBy.nickname : '系統',
                    window.adminCommon.formatDate(entry.createdAt),
                    entry.expiresAt ? window.adminCommon.formatDate(entry.expiresAt) : '永久',
                    entry.isActive ? '啟用' : '停用'
                ].join(','))
            ].join('\n');

            const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `ip-blacklist-${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
        } catch (error) {
            alert('匯出失敗: ' + error.message);
        }
    }

    // 初始化事件監聽器
    setupEventListeners() {
        // 添加黑名單表單
        const addForm = document.getElementById('addBlacklistForm');
        if (addForm) {
            addForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addIP();
            });
        }

        // 批量導入表單
        const bulkForm = document.getElementById('bulkImportForm');
        if (bulkForm) {
            bulkForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.bulkImportIPs();
            });
        }
    }

    // 初始化
    init() {
        this.setupEventListeners();
    }
}

// 全域實例
window.blacklist = new Blacklist();

// DOM 載入完成後初始化
document.addEventListener('DOMContentLoaded', () => {
    window.blacklist.init();
});