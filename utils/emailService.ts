import transporter from '@/lib/mailer';

interface SendEmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export async function sendEmail(options: SendEmailOptions) {
  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: options.to,
    subject: options.subject,
    text: options.text || '',
    html: options.html || '',
  };

  return transporter.sendMail(mailOptions);
}
