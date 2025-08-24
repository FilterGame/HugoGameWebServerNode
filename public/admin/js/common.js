// 管理後台共用功能
class AdminCommon {
    constructor() {
        this.currentUser = null;
        this.authToken = localStorage.getItem('adminToken');
        this.API_BASE = '/api';
    }

    // API 請求封裝
    async apiRequest(url, options = {}) {
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (this.authToken) {
            config.headers.Authorization = `Bearer ${this.authToken}`;
        }

        const response = await fetch(this.API_BASE + url, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'API request failed');
        }

        return data;
    }

    // 顯示錯誤訊息
    showError(message, elementId = 'loginError') {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.innerHTML = `<div class="alert alert-error">${message}</div>`;
        }
    }

    // 顯示成功訊息
    showSuccess(message, elementId) {
        const successElement = document.getElementById(elementId);
        if (successElement) {
            successElement.innerHTML = `<div class="alert alert-success">${message}</div>`;
        }
    }

    // 格式化日期
    formatDate(dateString) {
        return new Date(dateString).toLocaleString('zh-TW');
    }

    // 截斷文本
    truncateText(text, maxLength = 100) {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    // 登入功能
    async login(email, password) {
        try {
            const response = await this.apiRequest('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });

            this.authToken = response.token;
            localStorage.setItem('adminToken', this.authToken);
            this.currentUser = response.user;

            if (this.currentUser.role !== 'admin') {
                throw new Error('需要管理員權限');
            }

            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('adminPanel').style.display = 'block';
            
            // 初始化各個模組
            window.dashboard?.init();
            
            return true;
        } catch (error) {
            this.showError(error.message);
            return false;
        }
    }

    // 檢查現有 token
    async checkExistingToken() {
        if (!this.authToken) return false;

        try {
            const response = await this.apiRequest('/auth/me');
            this.currentUser = response.user;
            
            if (this.currentUser.role === 'admin') {
                document.getElementById('loginScreen').style.display = 'none';
                document.getElementById('adminPanel').style.display = 'block';
                
                // 初始化各個模組
                window.dashboard?.init();
                
                return true;
            } else {
                this.logout();
                return false;
            }
        } catch (error) {
            this.logout();
            return false;
        }
    }

    // 登出
    logout() {
        localStorage.removeItem('adminToken');
        this.authToken = null;
        this.currentUser = null;
        window.location.reload();
    }

    // 標籤切換
    setupTabNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const tabName = item.getAttribute('data-tab');
                
                // 更新導航
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                
                // 更新內容
                document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
                document.getElementById(tabName).classList.add('active');
                
                // 載入對應資料
                this.loadTabContent(tabName);
            });
        });
    }

    // 載入標籤內容
    loadTabContent(tabName) {
        switch(tabName) {
            case 'dashboard':
                window.dashboard?.load();
                break;
            case 'users':
                window.users?.load();
                break;
            case 'comments':
                window.comments?.load();
                break;
            case 'stats':
                window.stats?.load();
                break;
            case 'blacklist':
                window.blacklist?.load();
                break;
            case 'invalid-requests':
                window.invalidRequests?.load();
                break;
        }
    }

    // 分頁功能
    updatePagination(elementId, pagination, callback) {
        const paginationDiv = document.getElementById(elementId);
        if (!paginationDiv) return;
        
        let buttons = [];
        
        if (pagination.hasPrev) {
            buttons.push(`<button onclick="${this.getPaginationCallback(callback, pagination.currentPage - 1)}">上一頁</button>`);
        }
        
        const startPage = Math.max(1, pagination.currentPage - 2);
        const endPage = Math.min(pagination.totalPages, pagination.currentPage + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            buttons.push(`<button class="${i === pagination.currentPage ? 'active' : ''}" onclick="${this.getPaginationCallback(callback, i)}">${i}</button>`);
        }
        
        if (pagination.hasNext) {
            buttons.push(`<button onclick="${this.getPaginationCallback(callback, pagination.currentPage + 1)}">下一頁</button>`);
        }
        
        paginationDiv.innerHTML = buttons.join('');
    }

    // 生成分頁回調函數
    getPaginationCallback(callback, page) {
        if (typeof callback === 'string') {
            return `${callback}(${page})`;
        } else if (typeof callback === 'object' && callback.name) {
            return `window.${callback.name}(${page})`;
        } else if (typeof callback === 'function') {
            // 對於函數，我們需要將其綁定到全域物件
            const callbackName = `_paginationCallback_${Date.now()}`;
            window[callbackName] = callback;
            return `${callbackName}(${page})`;
        }
        return `console.error('Invalid pagination callback')`;
    }

    // 模態框功能
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // 設置模態框事件
    setupModals() {
        // 點擊背景關閉模態框
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // 點擊關閉按鈕
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = closeBtn.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        });
    }

    // 初始化
    init() {
        // 設置登入表單
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;

                await this.login(email, password);
            });
        }

        // 檢查現有 token
        this.checkExistingToken();

        // 設置標籤導航
        this.setupTabNavigation();

        // 設置模態框
        this.setupModals();
    }
}

// 全域實例
window.adminCommon = new AdminCommon();

// DOM 載入完成後初始化
document.addEventListener('DOMContentLoaded', () => {
    window.adminCommon.init();
});