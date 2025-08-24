const mongoose = require('mongoose');

const ipBlacklistSchema = new mongoose.Schema({
  ip: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  type: {
    type: String,
    enum: ['exact', 'subnet', 'range'],
    default: 'exact'
  },
  reason: {
    type: String,
    maxlength: 500,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

ipBlacklistSchema.index({ isActive: 1, expiresAt: 1 });

ipBlacklistSchema.methods.isExpired = function() {
  return this.expiresAt && this.expiresAt < new Date();
};

ipBlacklistSchema.statics.isIPBlocked = async function(clientIP) {
  const activeBlacklist = await this.find({
    isActive: true,
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  });

  for (const entry of activeBlacklist) {
    if (this.matchIP(clientIP, entry.ip, entry.type)) {
      return { blocked: true, reason: entry.reason, entry };
    }
  }

  return { blocked: false };
};

ipBlacklistSchema.statics.matchIP = function(clientIP, blacklistIP, type) {
  switch (type) {
    case 'exact':
      return clientIP === blacklistIP;
    
    case 'subnet':
      return this.isInSubnet(clientIP, blacklistIP);
    
    case 'range':
      return this.isInRange(clientIP, blacklistIP);
    
    default:
      return false;
  }
};

ipBlacklistSchema.statics.isInSubnet = function(clientIP, subnet) {
  try {
    const [network, prefixLength] = subnet.split('/');
    const prefix = parseInt(prefixLength);
    
    if (!network || isNaN(prefix) || prefix < 0 || prefix > 32) {
      return false;
    }

    const clientNum = this.ipToNumber(clientIP);
    const networkNum = this.ipToNumber(network);
    const mask = (0xffffffff << (32 - prefix)) >>> 0;

    return (clientNum & mask) === (networkNum & mask);
  } catch (error) {
    return false;
  }
};

ipBlacklistSchema.statics.isInRange = function(clientIP, range) {
  try {
    const [startIP, endIP] = range.split('-');
    if (!startIP || !endIP) {
      return false;
    }

    const clientNum = this.ipToNumber(clientIP);
    const startNum = this.ipToNumber(startIP.trim());
    const endNum = this.ipToNumber(endIP.trim());

    return clientNum >= startNum && clientNum <= endNum;
  } catch (error) {
    return false;
  }
};

ipBlacklistSchema.statics.ipToNumber = function(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
};

module.exports = mongoose.model('IPBlacklist', ipBlacklistSchema);