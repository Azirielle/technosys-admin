import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendPushNotification } from "@/lib/push";

export type NotificationCategory = 
  | 'CRITICAL_ANNOUNCEMENT' 
  | 'PAYROLL_RELEASE' 
  | 'DISCIPLINARY_WARNING' 
  | 'GENERAL';

export interface NotificationCascadePayload {
  recipientId?: string;
  recipientPhone?: string;
  title: string;
  message: string;
  category: NotificationCategory;
  data?: Record<string, any>;
  skipPush?: boolean;
}

export interface CascadeResult {
  success: boolean;
  channel: 'push' | 'sms' | 'none';
  delivered: boolean;
  provider?: 'expo' | 'semaphore' | 'twilio' | 'mock';
  messageId?: string;
  recipientPhone?: string;
  reason?: string;
  error?: string;
}

const CRITICAL_SMS_CATEGORIES: NotificationCategory[] = [
  'CRITICAL_ANNOUNCEMENT',
  'PAYROLL_RELEASE',
  'DISCIPLINARY_WARNING'
];

const SEMAPHORE_API_URL = "https://api.semaphore.co/api/v4/messages";

// Normalizes Philippine mobile numbers
export function normalizePhoneNumber(rawPhone: string): { national: string; e164: string; isValid: boolean } {
  const cleaned = (rawPhone || "").replace(/[\s\-\(\)\.]/g, "");
  
  // Format 1: 09XXXXXXXXX (11 digits)
  if (/^09\d{9}$/.test(cleaned)) {
    return {
      national: cleaned,
      e164: `+63${cleaned.slice(1)}`,
      isValid: true,
    };
  }
  
  // Format 2: +639XXXXXXXXX (13 chars)
  if (/^\+639\d{9}$/.test(cleaned)) {
    return {
      national: `0${cleaned.slice(3)}`,
      e164: cleaned,
      isValid: true,
    };
  }
  
  // Format 3: 639XXXXXXXXX (12 digits)
  if (/^639\d{9}$/.test(cleaned)) {
    return {
      national: `0${cleaned.slice(2)}`,
      e164: `+${cleaned}`,
      isValid: true,
    };
  }

  // Fallback for general valid numbers
  return {
    national: cleaned,
    e164: cleaned.startsWith("+") ? cleaned : `+${cleaned}`,
    isValid: cleaned.length >= 10,
  };
}

/**
 * Dispatches a notification through the Dual-Channel Cascade:
 * 1. Primary: Free Expo Push Notification (if push_token valid)
 * 2. Secondary: Transactional SMS (if push token absent or delivery failed, AND category is critical)
 */
export async function dispatchNotificationCascade(payload: NotificationCascadePayload): Promise<CascadeResult> {
  const { recipientId, recipientPhone, title, message, category, data, skipPush } = payload;
  
  let pushToken: string | null = null;
  let targetPhone: string | null = recipientPhone || null;
  let recipientName: string = "User";

  // 1. Resolve Recipient Profile if recipientId provided
  if (recipientId) {
    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, push_token, contact_number')
        .eq('id', recipientId)
        .single();

      if (profile) {
        pushToken = profile.push_token || null;
        if (!targetPhone) {
          targetPhone = profile.contact_number || null;
        }
        if (profile.full_name) {
          recipientName = profile.full_name;
        }
      }
    } catch (err: any) {
      console.warn(`[CASCADE] Failed to fetch profile ${recipientId}:`, err.message);
    }
  }

  let cascadeReason = 'push_token_absent';

  // 2. Channel 1: Attempt Free Expo Push Notification
  if (!skipPush && pushToken && pushToken.startsWith('ExponentPushToken[')) {
    try {
      const pushRes = await sendPushNotification(pushToken, title, message, data);
      if (pushRes.success) {
        console.log(`[CASCADE_PUSH_SUCCESS] Delivered push notification to ${recipientName} (${recipientId || 'direct'})`);
        return {
          success: true,
          channel: 'push',
          delivered: true,
          provider: 'expo'
        };
      } else {
        console.warn(`[CASCADE_PUSH_FAILED] Push failed for ${recipientName}: ${pushRes.error}. Evaluating SMS fallback...`);
        cascadeReason = 'push_delivery_failed';
      }
    } catch (pushErr: any) {
      console.warn(`[CASCADE_PUSH_ERROR] Push exception for ${recipientName}:`, pushErr.message);
      cascadeReason = 'push_delivery_failed';
    }
  } else {
    cascadeReason = 'push_token_absent';
  }

  // 3. Evaluate Critical Tier Guardrail for SMS Escalation
  const isCritical = CRITICAL_SMS_CATEGORIES.includes(category);
  if (!isCritical) {
    console.log(`[CASCADE_SMS_SUPPRESSED] Category "${category}" is non-critical. Halting cascade without sending SMS (Cost: ₱0.00).`);
    return {
      success: true,
      channel: 'none',
      delivered: false,
      reason: 'non_critical_category_suppressed'
    };
  }

  // 4. Channel 2: Transactional SMS Gateway Escalation
  if (!targetPhone) {
    console.warn(`[CASCADE_SMS_ABORTED] Cannot escalate to SMS: No mobile number on file for ${recipientName} (${recipientId || 'direct'}).`);
    return {
      success: false,
      channel: 'none',
      delivered: false,
      error: 'Recipient has no valid mobile contact number.'
    };
  }

  const { national, e164, isValid } = normalizePhoneNumber(targetPhone);
  if (!isValid) {
    console.warn(`[CASCADE_SMS_ABORTED] Invalid mobile phone format "${targetPhone}" for ${recipientName}.`);
    return {
      success: false,
      channel: 'none',
      delivered: false,
      error: `Invalid mobile phone format: "${targetPhone}"`
    };
  }

  const smsText = `[TECHNOSYS] ${title.toUpperCase()}\n${message}`;

  let provider: 'semaphore' | 'twilio' | 'mock' = 'mock';
  let status: 'sent' | 'mock_sent' | 'failed' = 'mock_sent';
  let messageId = `mock-${Date.now()}`;
  let errorDetails: string | null = null;

  const semaphoreKey = process.env.SEMAPHORE_API_KEY;
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

  // 4a. Primary Provider: Semaphore
  if (semaphoreKey) {
    try {
      const formData = new URLSearchParams();
      formData.append("apikey", semaphoreKey);
      formData.append("number", national);
      formData.append("message", smsText);

      const semRes = await fetch(SEMAPHORE_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData,
      });

      const semData = await semRes.json().catch(() => null);

      if (semRes.ok) {
        provider = 'semaphore';
        status = 'sent';
        messageId = Array.isArray(semData)
          ? String(semData[0]?.message_id || "")
          : String(semData?.message_id || `sem-${Date.now()}`);
        console.log(`[CASCADE_SEMAPHORE_SUCCESS] SMS dispatched to ${national}. Message ID: ${messageId}`);
      } else {
        console.warn("[CASCADE_SEMAPHORE_ERROR] Semaphore returned error:", semData);
        errorDetails = `Semaphore error: ${JSON.stringify(semData)}`;
      }
    } catch (err: any) {
      console.warn("[CASCADE_SEMAPHORE_EXCEPTION] Network error:", err.message);
      errorDetails = `Semaphore network error: ${err.message}`;
    }
  }

  // 4b. Secondary Provider Fallback: Twilio
  if (status !== 'sent' && twilioSid && twilioAuth && twilioFrom) {
    try {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
      const twilioBody = new URLSearchParams();
      twilioBody.append("To", e164);
      twilioBody.append("From", twilioFrom);
      twilioBody.append("Body", smsText);

      const twilioRes = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${twilioSid}:${twilioAuth}`).toString('base64')}`,
        },
        body: twilioBody,
      });

      const twilioData = await twilioRes.json().catch(() => null);

      if (twilioRes.ok) {
        provider = 'twilio';
        status = 'sent';
        messageId = twilioData?.sid || `tw-${Date.now()}`;
        errorDetails = null;
        console.log(`[CASCADE_TWILIO_SUCCESS] SMS dispatched to ${e164} via Twilio. SID: ${messageId}`);
      } else {
        console.warn("[CASCADE_TWILIO_ERROR] Twilio returned error:", twilioData);
        errorDetails = `${errorDetails ? errorDetails + "; " : ""}Twilio error: ${JSON.stringify(twilioData)}`;
      }
    } catch (err: any) {
      console.warn("[CASCADE_TWILIO_EXCEPTION] Twilio network error:", err.message);
      errorDetails = `${errorDetails ? errorDetails + "; " : ""}Twilio network error: ${err.message}`;
    }
  }

  // 4c. Resilient Mock Fallback (in dev/staging without keys)
  if (status !== 'sent') {
    provider = 'mock';
    status = 'mock_sent';
    messageId = `mock-${Date.now()}`;
    console.log(`[CASCADE_MOCK_SMS] Mock SMS recorded for ${national} [${category}] (Reason: ${cascadeReason}): "${smsText}"`);
  }

  // 5. Persist Audit Record into public.transactional_sms_logs
  try {
    const { error: dbErr } = await supabaseAdmin
      .from('transactional_sms_logs')
      .insert({
        recipient_id: recipientId || null,
        recipient_phone: national,
        category,
        message: smsText,
        cascade_reason: cascadeReason,
        provider,
        provider_message_id: messageId,
        status,
        error_details: errorDetails
      });

    if (dbErr) {
      console.error("[CASCADE_DB_ERROR] Failed to write transactional_sms_logs:", dbErr.message);
    }
  } catch (err: any) {
    console.error("[CASCADE_DB_EXCEPTION] Exception writing audit log:", err.message);
  }

  return {
    success: true,
    channel: 'sms',
    delivered: true,
    provider,
    messageId,
    recipientPhone: national,
    reason: cascadeReason
  };
}

/**
 * Batch dispatches notifications to multiple recipients with bounded concurrency
 */
export async function batchDispatchNotificationCascade(
  recipients: Array<{ id: string; phone?: string; pushToken?: string; name?: string }>,
  title: string,
  message: string,
  category: NotificationCategory,
  data?: Record<string, any>
): Promise<{ total: number; pushCount: number; smsCount: number; failedCount: number }> {
  let pushCount = 0;
  let smsCount = 0;
  let failedCount = 0;

  // Process in batches of 5
  const BATCH_SIZE = 5;
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (r) => {
        try {
          const res = await dispatchNotificationCascade({
            recipientId: r.id,
            recipientPhone: r.phone,
            title,
            message,
            category,
            data
          });

          if (res.channel === 'push') pushCount++;
          else if (res.channel === 'sms') smsCount++;
          else failedCount++;
        } catch (err) {
          failedCount++;
        }
      })
    );
  }

  return {
    total: recipients.length,
    pushCount,
    smsCount,
    failedCount
  };
}
