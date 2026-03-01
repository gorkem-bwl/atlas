import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    if (!env.SMTP_HOST) {
      logger.warn('SMTP not configured — emails will be logged to console');
      return null;
    }
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

export async function sendEmail(to: string, subject: string, html: string) {
  const t = getTransporter();
  if (!t) {
    logger.info({ to, subject }, 'Email (SMTP not configured, logging only)');
    return;
  }
  try {
    await t.sendMail({ from: env.SMTP_FROM, to, subject, html });
    logger.info({ to, subject }, 'Email sent');
  } catch (err) {
    logger.error({ err, to, subject }, 'Failed to send email');
    throw err;
  }
}

export async function sendInvitationEmail(to: string, data: {
  tenantName: string;
  inviterName?: string;
  role: string;
  token: string;
}) {
  const acceptUrl = `${env.CLIENT_PUBLIC_URL}/invite/${data.token}`;
  const subject = `You've been invited to join ${data.tenantName} on Atlas`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="font-size: 24px; font-weight: 600; color: #111; margin: 0;">Atlas</h1>
      </div>
      <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 16px;">
        ${data.inviterName ? `<strong>${data.inviterName}</strong> has invited you` : 'You have been invited'} to join <strong>${data.tenantName}</strong> as a <strong>${data.role}</strong>.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${acceptUrl}" style="display: inline-block; padding: 12px 32px; background: #13715B; color: #fff; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: 500;">
          Accept invitation
        </a>
      </div>
      <p style="font-size: 13px; color: #888; line-height: 1.5;">
        This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="font-size: 12px; color: #aaa; text-align: center;">
        Atlas — Your workspace platform
      </p>
    </div>
  `;
  await sendEmail(to, subject, html);
}

export async function sendPasswordResetEmail(to: string, data: { name?: string; token: string }) {
  const resetUrl = `${env.CLIENT_PUBLIC_URL}/reset-password/${data.token}`;
  const subject = 'Reset your Atlas password';
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="font-size: 24px; font-weight: 600; color: #111; margin: 0;">Atlas</h1>
      </div>
      <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 16px;">
        Hi${data.name ? ` ${data.name}` : ''},
      </p>
      <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 16px;">
        We received a request to reset your password. Click the button below to choose a new one.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 32px; background: #13715B; color: #fff; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: 500;">
          Reset password
        </a>
      </div>
      <p style="font-size: 13px; color: #888; line-height: 1.5;">
        This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="font-size: 12px; color: #aaa; text-align: center;">
        Atlas — Your workspace platform
      </p>
    </div>
  `;
  await sendEmail(to, subject, html);
}

export async function sendWelcomeEmail(to: string, data: { name: string; tenantName: string }) {
  const loginUrl = `${env.CLIENT_PUBLIC_URL}/login`;
  const subject = `Welcome to Atlas, ${data.name}!`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="font-size: 24px; font-weight: 600; color: #111; margin: 0;">Atlas</h1>
      </div>
      <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 16px;">
        Welcome to Atlas! Your workspace <strong>${data.tenantName}</strong> is ready.
      </p>
      <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 16px;">
        You can now invite team members, install apps, and start collaborating.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${loginUrl}" style="display: inline-block; padding: 12px 32px; background: #13715B; color: #fff; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: 500;">
          Go to Atlas
        </a>
      </div>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="font-size: 12px; color: #aaa; text-align: center;">
        Atlas — Your workspace platform
      </p>
    </div>
  `;
  await sendEmail(to, subject, html);
}
