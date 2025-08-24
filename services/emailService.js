const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.setupTransporter();
  }

  setupTransporter() {
    // Skip email setup if email verification is disabled
    if (process.env.EMAIL_VERIFICATION_ENABLED !== 'true') {
      console.log('Email verification disabled, skipping email service setup');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });

      // Verify connection configuration
      this.transporter.verify(function(error, success) {
        if (error) {
          console.error('Email service configuration error:', error);
        } else {
          console.log('Email service is ready to send messages');
        }
      });
    } catch (error) {
      console.error('Failed to setup email service:', error);
    }
  }

  async sendVerificationEmail(userEmail, nickname, verificationToken) {
    if (!this.transporter) {
      console.log('Email service not configured, skipping email send');
      return { success: false, error: 'Email service not configured' };
    }

    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:1313'}/?verify_token=${verificationToken}`;
    
    const emailTemplate = this.getVerificationEmailTemplate(nickname, verificationUrl);

    try {
      const info = await this.transporter.sendMail({
        from: `"${process.env.EMAIL_FROM_NAME || 'Hugo Game Website'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: process.env.EMAIL_VERIFICATION_SUBJECT || '請驗證您的電子郵件地址',
        html: emailTemplate
      });

      console.log('Verification email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Failed to send verification email:', error);
      return { success: false, error: error.message };
    }
  }

  getVerificationEmailTemplate(nickname, verificationUrl) {
    return `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>驗證您的電子郵件</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 20px;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 300;
        }
        .content {
            padding: 40px 30px;
        }
        .welcome-text {
            font-size: 18px;
            margin-bottom: 20px;
        }
        .verify-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            padding: 15px 30px;
            border-radius: 25px;
            font-weight: bold;
            margin: 20px 0;
            transition: transform 0.2s;
        }
        .verify-button:hover {
            transform: translateY(-2px);
        }
        .info-box {
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin: 20px 0;
            border-radius: 0 5px 5px 0;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 14px;
            color: #666;
            border-top: 1px solid #eee;
        }
        .alternative-link {
            font-size: 12px;
            color: #666;
            margin-top: 20px;
            word-break: break-all;
        }
        @media (max-width: 600px) {
            .content {
                padding: 30px 20px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>🎮 ${process.env.WEBSITE_NAME || 'Hugo Game Website'}</h1>
        </div>
        
        <div class="content">
            <div class="welcome-text">
                <strong>您好 ${nickname}！</strong>
            </div>
            
            <p>歡迎加入我們的遊戲社區！為了確保您的帳戶安全，請點擊下方按鈕驗證您的電子郵件地址：</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" class="verify-button">
                    ✉️ 驗證電子郵件
                </a>
            </div>
            
            <div class="info-box">
                <strong>重要提醒：</strong>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>此驗證連結將於 <strong>24小時後過期</strong></li>
                    <li>驗證完成後，您就可以開始發文和評分了</li>
                    <li>如果按鈕無法點擊，請複製下方連結到瀏覽器開啟</li>
                </ul>
            </div>
            
            <p>如果您沒有註冊此帳戶，請忽略這封郵件。</p>
            
            <div class="alternative-link">
                <strong>驗證連結：</strong><br>
                ${verificationUrl}
            </div>
        </div>
        
        <div class="footer">
            <p>© ${new Date().getFullYear()} ${process.env.WEBSITE_NAME || 'Hugo Game Website'}. 版權所有。</p>
            <p>這是一封自動發送的郵件，請勿回覆。</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  // Test email configuration
  async testConnection() {
    if (!this.transporter) {
      return { success: false, error: 'Email service not configured' };
    }

    try {
      await this.transporter.verify();
      return { success: true, message: 'Email service connection successful' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();