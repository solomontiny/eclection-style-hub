import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const DEFAULT_FROM = "no-reply@supplieraffordable.com";
const REPLY_TO = "SupplierAffordable.careline@gmail.com";

function getResendClient(): Resend | null {
  if (!RESEND_API_KEY) {
    return null;
  }
  return new Resend(RESEND_API_KEY);
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const client = getResendClient();

  if (!client) {
    const error = "RESEND_API_KEY is not configured.";
    console.log("[EMAIL] Skipped (no API key):", {
      to: options.to,
      subject: options.subject,
    });
    return { success: false, error };
  }

  const from = options.from || DEFAULT_FROM;
  const replyTo = options.replyTo || REPLY_TO;

  try {
    const { data, error } = await client.emails.send({
      from,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo,
    });

    if (error) {
      console.error("[EMAIL] Resend error:", error.message);
      return { success: false, error: error.message };
    }

    console.log("[EMAIL] Sent successfully:", {
      to: options.to,
      subject: options.subject,
      messageId: data?.id,
    });

    return { success: true, messageId: data?.id };
  } catch (err: unknown) {
    const message = (err as Error)?.message || "Email delivery failed.";
    console.error("[EMAIL] Unexpected error:", message);
    return { success: false, error: message };
  }
}

export function isEmailConfigured(): boolean {
  return Boolean(RESEND_API_KEY);
}