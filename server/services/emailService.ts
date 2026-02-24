// Email service stub - to be implemented with actual email provider
import { notifyOwner } from "../_core/notification";

export async function sendAlertEmail(
  recipient: string, 
  subject: string, 
  message: string
): Promise<boolean> {
  try {
    // For now, use notifyOwner as fallback
    console.log(`[EmailService] Sending email to ${recipient}: ${subject}`);
    
    // In production, integrate with actual email provider (SendGrid, SES, etc.)
    // For now, notify owner as fallback
    await notifyOwner({
      title: `Email Alert: ${subject}`,
      content: `To: ${recipient}\n\n${message}`,
    });
    
    return true;
  } catch (error) {
    console.error('[EmailService] Error sending email:', error);
    return false;
  }
}

export async function sendBulkEmail(
  recipients: string[],
  subject: string,
  htmlContent: string
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  
  for (const recipient of recipients) {
    const success = await sendAlertEmail(recipient, subject, htmlContent);
    if (success) {
      sent++;
    } else {
      failed++;
    }
  }
  
  return { sent, failed };
}
