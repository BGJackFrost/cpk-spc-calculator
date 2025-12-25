/**
 * Script test gửi email qua SMTP Gmail
 */

import nodemailer from 'nodemailer';
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  console.log('📧 Testing SMTP Email...\n');
  
  // Get SMTP config from database
  const connection = await mysql.createConnection(DATABASE_URL);
  const [configs] = await connection.execute('SELECT * FROM smtp_config LIMIT 1');
  await connection.end();
  
  if (configs.length === 0) {
    console.error('❌ SMTP config not found in database');
    process.exit(1);
  }
  
  const config = configs[0];
  console.log('📋 SMTP Configuration:');
  console.log(`   Host: ${config.host}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   Secure: ${config.secure === 1 ? 'Yes (SSL)' : 'No (TLS)'}`);
  console.log(`   Username: ${config.username}`);
  console.log(`   From: ${config.fromName} <${config.fromEmail}>`);
  console.log('');
  
  // Create transporter
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure === 1, // true for 465, false for 587
    auth: {
      user: config.username,
      pass: config.password,
    },
    tls: {
      rejectUnauthorized: false
    }
  });
  
  // Verify connection
  console.log('🔗 Verifying SMTP connection...');
  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!\n');
  } catch (error) {
    console.error('❌ SMTP connection failed:', error.message);
    process.exit(1);
  }
  
  // Send test email
  console.log('📤 Sending test email...');
  
  const testEmail = {
    from: `"${config.fromName}" <${config.fromEmail}>`,
    to: config.username, // Send to self for testing
    subject: '[TEST] SPC/CPK Calculator - Email Test',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .footer { background: #1f2937; color: #9ca3af; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; }
    .success-box { background: #d1fae5; border: 1px solid #6ee7b7; border-radius: 6px; padding: 15px; margin: 15px 0; text-align: center; }
    .info-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    .info-table td { padding: 8px; border-bottom: 1px solid #e5e7eb; }
    .info-table td:first-child { font-weight: bold; width: 40%; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">✅ Email Test Successful</h1>
      <p style="margin: 5px 0 0 0; opacity: 0.9;">Hệ thống SPC/CPK Calculator</p>
    </div>
    <div class="content">
      <div class="success-box">
        <h2 style="color: #059669; margin: 0;">🎉 Cấu hình SMTP hoạt động tốt!</h2>
      </div>
      
      <h3>Thông tin cấu hình:</h3>
      <table class="info-table">
        <tr><td>SMTP Server</td><td>${config.host}:${config.port}</td></tr>
        <tr><td>Security</td><td>${config.secure === 1 ? 'SSL' : 'TLS (STARTTLS)'}</td></tr>
        <tr><td>From Email</td><td>${config.fromEmail}</td></tr>
        <tr><td>From Name</td><td>${config.fromName}</td></tr>
        <tr><td>Test Time</td><td>${new Date().toLocaleString('vi-VN')}</td></tr>
      </table>
      
      <p style="margin-top: 20px;">
        <strong>Các tính năng email đã sẵn sàng:</strong>
      </p>
      <ul>
        <li>✅ Cảnh báo vi phạm SPC Rules</li>
        <li>✅ Cảnh báo CPK thấp (< 1.33)</li>
        <li>✅ Báo cáo SPC tự động</li>
        <li>✅ Thông báo bảo trì</li>
        <li>✅ Cảnh báo OEE thấp</li>
      </ul>
    </div>
    <div class="footer">
      <p>Email này được gửi tự động từ Hệ thống SPC/CPK Calculator</p>
      <p>© ${new Date().getFullYear()} Foutec Digital. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `
  };
  
  try {
    const info = await transporter.sendMail(testEmail);
    console.log('✅ Test email sent successfully!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   To: ${testEmail.to}`);
    console.log('\n🎉 SMTP configuration is working correctly!');
  } catch (error) {
    console.error('❌ Failed to send test email:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
