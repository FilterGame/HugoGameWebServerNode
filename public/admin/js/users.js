// 用戶管理模組
class Users {
    constructor() {
        this.currentPage = 1;
        this.searchQuery = '';
    }

    // 載入用戶列表
    async load(page = 1, search = '') {
        try {
            this.currentPage = page;
            this.searchQuery = search;
            
            const data = await window.adminCommon.apiRequest(`/admin/users?page=${page}&search=${search}`);
            this.render(data);
        } catch (error) {
            console.error('載入用戶失敗:', error);
            window.adminCommon.showError('載入用戶失敗: ' + error.message);
        }
    }

    // 渲染用戶列表
    render(data) {
        const usersBody = document.querySelector('#usersTable tbody');
        if (!usersBody) return;

        usersBody.innerHTML = data.users.map(user => `
            <tr>
                <td>
                    ${user.nickname}
                    ${user.emailVerified !== undefined ? 
                        `<div class="ip-info">
                            <span class="status-badge ${user.emailVerified ? 'status-active' : 'status-inactive'}">
                                ${user.emailVerified ? '已驗證' : '未驗證'}
                            </span>
                        </div>` : ''
                    }
                </td>
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td>
                    <span class="status-badge ${user.isActive ? 'status-active' : 'status-inactive'}">
                        ${user.isActive ? '活躍' : '停用'}
                    </span>
                </td>
                <td>
                    留言: ${user.permissions.canComment ? '✓' : '✗'} |
                    評分: ${user.permissions.canRate ? '✓' : '✗'} |
                    發文: ${user.permissions.canPost ? '✓' : '✗'}
                </td>
                <td>
                    <button class="btn ${user.isActive ? 'btn-danger' : 'btn-success'}" 
                            onclick="window.users.toggleUserStatus('${user._id}', ${!user.isActive})">
                        ${user.isActive ? '停用' : '啟用'}
                    </button>
                    <button class="btn btn-primary" onclick="window.users.editUserPermissions('${user._id}')">
                        編輯權限
                    </button>
                    ${user.loginIPs && user.loginIPs.length > 0 ? 
                        `<button class="btn btn-warning" onclick="window.users.showUserIPs('${user._id}', '${user.nickname}')">
                            查看IP
                        </button>` : ''
                    }
                </td>
            </tr>
        `).join('');
        
        // 更新分頁
        window.adminCommon.updatePagination('usersPagination', data.pagination, 'window.users.load');
    }

    // 切換用戶狀態
    async toggleUserStatus(userId, isActive) {
        try {
            await window.adminCommon.apiRequest(`/admin/users/${userId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ isActive })
            });
            this.load(this.currentPage, this.searchQuery);
        } catch (error) {
            alert('操作失敗: ' + error.message);
        }
    }

    // 編輯用戶權限
    editUserPermissions(userId) {
        // 簡化版權限編輯（可擴展為彈窗形式）
        const canComment = confirm('允許留言？');
        const canRate = confirm('允許評分？');
        const canPost = confirm('允許發文？');
        
        window.adminCommon.apiRequest(`/admin/users/${userId}/permissions`, {
            method: 'PUT',
            body: JSON.stringify({
                permissions: { canComment, canRate, canPost }
            })
        }).then(() => {
            this.load(this.currentPage, this.searchQuery);
        }).catch(error => {
            alert('操作失敗: ' + error.message);
        });
    }

    // 顯示用戶IP信息
    async showUserIPs(userId, nickname) {
        try {
            const response = await window.adminCommon.apiRequest(`/admin/users/${userId}`);
            const user = response.user;
            
            if (!user.loginIPs || user.loginIPs.length === 0) {
                alert('該用戶沒有IP記錄');
                return;
            }

            let ipInfo = `用戶 ${nickname} 的IP記錄：\n\n`;
            user.loginIPs.forEach((ipRecord, index) => {
                ipInfo += `${index + 1}. IP: ${ipRecord.ip}\n`;
                ipInfo += `   最後登入: ${window.adminCommon.formatDate(ipRecord.lastLoginAt)}\n`;
                ipInfo += `   登入次數: ${ipRecord.loginCount}\n\n`;
            });

            const addToBlacklist = confirm(ipInfo + '\n是否要將某個IP加入黑名單？');
            if (addToBlacklist) {
                const ipToBlock = prompt('請輸入要封鎖的IP地址：');
                if (ipToBlock && user.loginIPs.some(record => record.ip === ipToBlock)) {
                    this.addIPToBlacklist(ipToBlock, `用戶 ${nickname} 的IP`);
                } else if (ipToBlock) {
                    alert('該IP不在用戶的登入記錄中');
                }
            }
        } catch (error) {
            alert('獲取用戶IP信息失敗: ' + error.message);
        }
    }

    // 將IP加入黑名單
    async addIPToBlacklist(ip, reason) {
        try {
            await window.adminCommon.apiRequest('/admin/ip-blacklist', {
                method: 'POST',
                body: JSON.stringify({
                    ip: ip,
                    type: 'exact',
                    reason: reason
                })
            });
            alert('IP已加入黑名單');
        } catch (error) {
            alert('加入黑名單失敗: ' + error.message);
        }
    }

    // 初始化事件監聽器
    setupEventListeners() {
        const userSearch = document.getElementById('userSearch');
        if (userSearch) {
            userSearch.addEventListener('input', (e) => {
                this.load(1, e.target.value);
            });
        }
    }

    // 初始化
    init() {
        this.setupEventListeners();
    }
}

// 全域實例
window.users = new Users();

// DOM 載入完成後初始化
document.addEventListener('DOMContentLoaded', () => {
    window.users.init();
});