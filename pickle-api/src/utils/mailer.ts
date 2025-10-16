import nodemailer from "nodemailer";

export function getTransport() {
  const host = process.env.SMTP_HOST!;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER!;
  const pass = process.env.SMTP_PASS!;
  if (!host || !user || !pass) throw new Error("Missing SMTP config");

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendResetEmail(to: string, token: string) {
  const from = process.env.MAIL_FROM || "no-reply@example.com";
  const appName = process.env.APP_NAME || "Pickle Courts";
  const help = "Mã khôi phục của bạn là:";
  const html = `
    <p>${help}</p>
    <p style="font-size:18px;font-weight:bold">${token}</p>
    <p>Mã có hiệu lực 30 phút.</p>
  `;
  await getTransport().sendMail({
    from,
    to,
    subject: `[${appName}] Khôi phục mật khẩu`,
    html,
  });
}
