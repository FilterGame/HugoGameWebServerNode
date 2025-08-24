const { getClientIP } = require('./ipCheck');

// 記憶體中的無效請求統計
class InvalidRequestTracker {
    constructor() {
        this.requests = [];
        this.maxRequests = 1000; // 最多保留1000條記錄
    }

    addRequest(req, error, statusCode = 500) {
        const clientIP = req.clientIP || getClientIP(req);
        
        const requestInfo = {
            id: Date.now() + Math.random(), // 簡單的ID生成
            ip: clientIP,
            method: req.method,
            url: req.originalUrl || req.url,
            userAgent: req.get('User-Agent') || 'Unknown',
            timestamp: new Date(),
            statusCode: statusCode,
            error: error ? error.message : 'Unknown error',
            headers: {
                host: req.get('host'),
                origin: req.get('origin'),
                referer: req.get('referer'),
                'content-type': req.get('content-type')
            },
            body: req.method === 'POST' || req.method === 'PUT' ? 
                  this.sanitizeBody(req.body) : null,
            query: req.query
        };

        this.requests.unshift(requestInfo);

        // 保持記錄數量在限制內
        if (this.requests.length > this.maxRequests) {
            this.requests = this.requests.slice(0, this.maxRequests);
        }
    }

    // 清理敏感信息
    sanitizeBody(body) {
        if (!body) return null;
        
        const sanitized = { ...body };
        const sensitiveFields = ['password', 'token', 'secret', 'key'];
        
        sensitiveFields.forEach(field => {
            if (sanitized[field]) {
                sanitized[field] = '[HIDDEN]';
            }
        });

        return JSON.stringify(sanitized).substring(0, 500); // 限制長度
    }

    getRequests(page = 1, limit = 20, ip = '') {
        let filteredRequests = this.requests;

        // IP過濾
        if (ip) {
            filteredRequests = this.requests.filter(req => 
                req.ip.includes(ip)
            );
        }

        const totalRequests = filteredRequests.length;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;

        return {
            requests: filteredRequests.slice(startIndex, endIndex),
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalRequests / limit),
                totalRequests: totalRequests,
                hasNext: endIndex < totalRequests,
                hasPrev: page > 1
            }
        };
    }

    getStats() {
        const now = new Date();
        const oneHour = 60 * 60 * 1000;
        const oneDay = 24 * oneHour;

        const recentRequests = this.requests.filter(req => 
            (now - req.timestamp) < oneHour
        );

        const dailyRequests = this.requests.filter(req => 
            (now - req.timestamp) < oneDay
        );

        // 統計各種狀態碼
        const statusCodeStats = {};
        this.requests.forEach(req => {
            statusCodeStats[req.statusCode] = (statusCodeStats[req.statusCode] || 0) + 1;
        });

        // 統計最頻繁的IP
        const ipStats = {};
        this.requests.forEach(req => {
            ipStats[req.ip] = (ipStats[req.ip] || 0) + 1;
        });

        // 獲取前10個最頻繁的IP
        const topIPs = Object.entries(ipStats)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([ip, count]) => ({ ip, count }));

        // 統計最頻繁的路徑
        const pathStats = {};
        this.requests.forEach(req => {
            const path = req.url.split('?')[0]; // 移除query參數
            pathStats[path] = (pathStats[path] || 0) + 1;
        });

        const topPaths = Object.entries(pathStats)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([path, count]) => ({ path, count }));

        return {
            totalRequests: this.requests.length,
            recentRequests: recentRequests.length, // 最近1小時
            dailyRequests: dailyRequests.length,   // 最近24小時
            statusCodeStats,
            topIPs,
            topPaths,
            lastUpdate: now
        };
    }

    clearRequests() {
        this.requests = [];
    }

    removeRequest(id) {
        this.requests = this.requests.filter(req => req.id !== id);
    }

    // 獲取指定IP的所有請求
    getRequestsByIP(ip) {
        return this.requests.filter(req => req.ip === ip);
    }
}

// 單例模式
const tracker = new InvalidRequestTracker();

// 404中間件
const track404 = (req, res, next) => {
    // 創建一個自定義的404響應
    tracker.addRequest(req, new Error('Route not found'), 404);
    res.status(404).json({ error: 'Route not found' });
};

// 錯誤處理中間件
const trackErrors = (err, req, res, next) => {
    const statusCode = err.statusCode || err.status || 500;
    
    // 記錄錯誤
    tracker.addRequest(req, err, statusCode);
    
    // 如果是開發環境，記錄到控制台
    if (process.env.NODE_ENV === 'development') {
        console.error('Invalid request tracked:', {
            ip: req.clientIP || getClientIP(req),
            method: req.method,
            url: req.originalUrl,
            error: err.message,
            statusCode: statusCode
        });
    }

    // 傳遞給下一個錯誤處理器
    next(err);
};

// 手動記錄無效請求的函數（用於其他地方調用）
const trackInvalidRequest = (req, error, statusCode = 400) => {
    tracker.addRequest(req, error, statusCode);
};

module.exports = {
    tracker,
    track404,
    trackErrors,
    trackInvalidRequest
};