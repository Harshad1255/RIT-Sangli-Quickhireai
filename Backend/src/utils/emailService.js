const nodemailer = require('nodemailer');
const capturedMessages = [];

const getSmtpConfig = () => {
  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 587);
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASSWORD;
  const from = process.env.EMAIL_FROM || process.env.SMTP_FROM || '"QuickHire AI" <no-reply@quickhireai.com>';

  return {
    host,
    port,
    secure: port === 465,
    user,
    pass,
    from
  };
};

const sendOTPEmail = async (email, otp) => {
  try {
    const smtpConfig = getSmtpConfig();
    const useJsonTransport = process.env.NODE_ENV === 'test' && process.env.MAIL_TRANSPORT === 'json';

    if (!useJsonTransport && (!smtpConfig.user || !smtpConfig.pass)) {
      const missingConfigError = new Error(
        'SMTP credentials are missing. Configure EMAIL_USER/EMAIL_PASSWORD or SMTP_USER/SMTP_PASS in Backend/.env.'
      );
      console.error('OTP email configuration error:', {
        email,
        smtpHost: smtpConfig.host,
        smtpPort: smtpConfig.port,
        hasUser: !!smtpConfig.user,
        hasPass: !!smtpConfig.pass
      });
      throw missingConfigError;
    }

    const transporter = useJsonTransport
      ? nodemailer.createTransport({ jsonTransport: true })
      : nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: {
          user: smtpConfig.user,
          pass: smtpConfig.pass,
        },
      });

    const mailOptions = {
      from: smtpConfig.from,
      to: email,
      subject: 'QuickHire AI - Email Verification OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #2b7cff; text-align: center;">QuickHire AI</h2>
          <p style="font-size: 16px; color: #333;">Hello,</p>
          <p style="font-size: 16px; color: #333;">Your One-Time Password (OTP) for login is:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; background: #f8fafc; padding: 15px 30px; border-radius: 8px; letter-spacing: 5px; color: #0f172a;">${otp}</span>
          </div>
          <p style="font-size: 14px; color: #64748b; text-align: center;">This OTP is valid for <strong>5 minutes</strong>.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">If you did not request this OTP, you can safely ignore this email.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    if (useJsonTransport) {
      const message = Buffer.isBuffer(info.message) ? info.message.toString() : String(info.message);
      capturedMessages.push(JSON.parse(message));
    }
    console.log(`Email sent successfully to ${email}. MessageId: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending OTP email:', {
      email,
      message: error.message,
      code: error.code,
      response: error.response && {
        code: error.response.code,
        command: error.response.command,
        response: error.response.response
      }
    });
    throw new Error(error.message || 'Failed to send email. Please check email configuration.');
  }
};

module.exports = {
  sendOTPEmail,
  getCapturedMessages: () => [...capturedMessages],
  clearCapturedMessages: () => capturedMessages.splice(0, capturedMessages.length),
};
