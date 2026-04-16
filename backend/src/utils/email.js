// utils/email.js
import nodemailer from 'nodemailer';

/**
 * Create a reusable transporter using SMTP credentials from .env
 * Works with Bravo SMTP, Zoho, SendGrid, etc.
 * Required env vars:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: parseInt(process.env.SMTP_PORT) === 465, // true for 465, false otherwise
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false, // Allow self-signed certs (dev)
    },
  });
};

/**
 * Validate email format
 * @param {string} email
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
  if (!email) return false;
  const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
};

/**
 * Send an email
 * @param {Object} options
 * @param {string|string[]} options.to - Recipient email(s)
 * @param {string} options.subject - Email subject
 * @param {string} [options.html] - HTML body
 * @param {string} [options.text] - Plain text body (fallback)
 * @param {string} [options.from] - Sender (defaults to EMAIL_FROM env)
 * @returns {Promise<Object>} Nodemailer send result
 */
export const sendEmail = async ({ to, subject, html, text, from }) => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('SMTP configuration missing. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env');
  }

  const transporter = createTransporter();

  const mailOptions = {
    from: from || process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    ...(html ? { html } : {}),
    ...(text ? { text } : {}),
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`📧 Email sent to ${mailOptions.to}: ${info.messageId}`);
  return info;
};

/**
 * Send a billing confirmation email
 * @param {Object} billingData - Billing record
 * @param {string} customerEmail - Customer's email address
 */
export const sendBillConfirmationEmail = async (billingData, customerEmail) => {
  if (!isValidEmail(customerEmail)) {
    console.warn(`Invalid or missing customer email: ${customerEmail}`);
    return null;
  }

  const itemsHtml = (billingData.items || [])
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px;border-bottom:1px solid #f0f0f0;">${item.product?.product_name || item.product_name || 'Item'}</td>
          <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:center;">${item.quantity}</td>
          <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:right;">₹${parseFloat(item.unit_price).toFixed(2)}</td>
          <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:right;">₹${parseFloat(item.total_price).toFixed(2)}</td>
        </tr>`
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>Bill Confirmation</title></head>
    <body style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a2e;background:#f8fafc;padding:24px;">
      <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#7c3aed,#a78bfa);padding:28px 32px;">
          <h1 style="color:#fff;margin:0;font-size:22px;">Bill Confirmation</h1>
          <p style="color:rgba(255,255,255,0.85);margin:6px 0 0 0;font-size:14px;">Thank you for your purchase!</p>
        </div>
        
        <!-- Details -->
        <div style="padding:28px 32px;">
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
            <tr>
              <td style="padding:6px 0;color:#6b7280;font-size:13px;">Bill No</td>
              <td style="padding:6px 0;font-weight:600;">${billingData.billing_no}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#6b7280;font-size:13px;">Customer</td>
              <td style="padding:6px 0;font-weight:600;">${billingData.customer_name || 'Valued Customer'}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#6b7280;font-size:13px;">Date</td>
              <td style="padding:6px 0;">${new Date(billingData.billing_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#6b7280;font-size:13px;">Payment</td>
              <td style="padding:6px 0;text-transform:capitalize;">${billingData.payment_method}</td>
            </tr>
          </table>

          <!-- Items -->
          <h3 style="font-size:15px;margin-bottom:12px;color:#374151;">Items Purchased</h3>
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="background:#f9fafb;">
                <th style="padding:10px 8px;text-align:left;color:#6b7280;font-weight:600;">Product</th>
                <th style="padding:10px 8px;text-align:center;color:#6b7280;font-weight:600;">Qty</th>
                <th style="padding:10px 8px;text-align:right;color:#6b7280;font-weight:600;">Price</th>
                <th style="padding:10px 8px;text-align:right;color:#6b7280;font-weight:600;">Total</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>

          <!-- Summary -->
          <div style="background:#f9fafb;border-radius:10px;padding:16px;margin-top:20px;">
            <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;">
              <span style="color:#6b7280;">Subtotal</span>
              <span>₹${parseFloat(billingData.subtotal_amount || 0).toFixed(2)}</span>
            </div>
            ${billingData.tax_amount > 0 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;"><span style="color:#6b7280;">GST / Tax</span><span>₹${parseFloat(billingData.tax_amount).toFixed(2)}</span></div>` : ''}
            ${billingData.discount_amount > 0 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;"><span style="color:#6b7280;">Discount</span><span style="color:#16a34a;">-₹${parseFloat(billingData.discount_amount).toFixed(2)}</span></div>` : ''}
            <div style="display:flex;justify-content:space-between;padding:10px 0 0 0;border-top:1.5px solid #e5e7eb;margin-top:8px;">
              <span style="font-weight:700;font-size:15px;">Total Due</span>
              <span style="font-weight:700;font-size:15px;color:#7c3aed;">₹${parseFloat(billingData.total_amount || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #f0f0f0;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">This is an auto-generated bill confirmation. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: customerEmail,
    subject: `Bill Confirmation - ${billingData.billing_no}`,
    html,
  });
};

/**
 * Send an OTP email for verification
 * @param {string} email - Recipient email
 * @param {string} otp - OTP code
 */
export const sendOtpEmail = async (email, otp) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>Email Verification</title></head>
    <body style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a2e;background:#f8fafc;padding:24px;">
      <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
        <div style="background:linear-gradient(135deg,#7c3aed,#a78bfa);padding:28px 32px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:22px;">Verify Your Email</h1>
        </div>
        <div style="padding:32px;text-align:center;">
          <p style="color:#4b5563;font-size:16px;margin-bottom:24px;">Use the following code to verify your email address. This code will expire in 10 minutes.</p>
          <div style="background:#f3f4f6;padding:20px;border-radius:12px;display:inline-block;margin-bottom:24px;">
            <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#7c3aed;">${otp}</span>
          </div>
          <p style="color:#9ca3af;font-size:14px;">If you didn't request this code, you can safely ignore this email.</p>
        </div>
        <div style="background:#f9fafb;padding:16px;text-align:center;border-top:1px solid #f0f0f0;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">&copy; ${new Date().getFullYear()} Your Billing Software. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Verification Code - Your Billing Software',
    html,
  });
};

export default { sendEmail, sendBillConfirmationEmail, isValidEmail, sendOtpEmail };
