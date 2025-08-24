const IPBlacklist = require('../models/IPBlacklist');

// 取得真實客戶端 IP
const getClientIP = (req) => {
  return req.headers['x-forwarded-for'] ||
         req.headers['x-real-ip'] ||
         req.connection.remoteAddress ||
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         req.ip ||
         '127.0.0.1';
};

// IP 黑名單檢查中間件
const checkIPBlacklist = async (req, res, next) => {
  try {
    const clientIP = getClientIP(req);
    req.clientIP = clientIP.replace('::ffff:', ''); // 移除 IPv6 前綴

    const blacklistResult = await IPBlacklist.isIPBlocked(req.clientIP);
    
    if (blacklistResult.blocked) {
      return res.status(403).json({
        error: 'IP 已被封鎖',
        message: blacklistResult.reason || '您的 IP 位址已被系統封鎖',
        blocked: true
      });
    }

    next();
  } catch (error) {
    console.error('IP 黑名單檢查錯誤:', error);
    // 如果檢查失敗，不阻止請求，但記錄錯誤
    req.clientIP = getClientIP(req).replace('::ffff:', '');
    next();
  }
};

// 記錄用戶登入 IP
const recordLoginIP = async (user, clientIP) => {
  try {
    const existingIPIndex = user.loginIPs.findIndex(item => item.ip === clientIP);
    
    if (existingIPIndex !== -1) {
      // 更新現有 IP 記錄
      user.loginIPs[existingIPIndex].lastLoginAt = new Date();
      user.loginIPs[existingIPIndex].loginCount += 1;
    } else {
      // 新增新的 IP 記錄
      user.loginIPs.unshift({
        ip: clientIP,
        lastLoginAt: new Date(),
        loginCount: 1
      });
      
      // 只保留最近 3 個不同的 IP
      if (user.loginIPs.length > 3) {
        user.loginIPs = user.loginIPs.slice(0, 3);
      }
    }
    
    // 更新最後登入時間
    user.lastLogin = new Date();
    await user.save();
  } catch (error) {
    console.error('記錄登入 IP 錯誤:', error);
  }
};

module.exports = {
  getClientIP,
  checkIPBlacklist,
  recordLoginIP
};