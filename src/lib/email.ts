import { Resend } from "resend";

export const resend = new Resend(process.env.AUTH_RESEND_KEY);

const from = process.env.EMAIL_FROM ?? "onboarding@resend.dev";

export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string | string[];
  subject: string;
  react: React.ReactElement;
}) {
  return resend.emails.send({
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    react,
  });
}
