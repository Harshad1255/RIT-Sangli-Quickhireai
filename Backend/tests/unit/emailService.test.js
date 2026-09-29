const {
  clearCapturedMessages,
  getCapturedMessages,
  sendOTPEmail,
} = require('../../src/utils/emailService');

describe('emailService test transport', () => {
  const originalMailTransport = process.env.MAIL_TRANSPORT;

  beforeAll(() => {
    process.env.MAIL_TRANSPORT = 'json';
  });

  afterAll(() => {
    if (originalMailTransport === undefined) {
      delete process.env.MAIL_TRANSPORT;
    } else {
      process.env.MAIL_TRANSPORT = originalMailTransport;
    }
  });

  beforeEach(() => {
    clearCapturedMessages();
  });

  it('captures OTP mail as JSON without SMTP credentials or network access', async () => {
    await expect(sendOTPEmail('candidate@example.test', '123456')).resolves.toBe(true);

    const [message] = getCapturedMessages();
    expect(message.to.map((recipient) => recipient.address)).toContain('candidate@example.test');
    expect(message.html).toContain('123456');
  });
});