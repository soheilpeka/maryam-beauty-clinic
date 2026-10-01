/**
 * Notification provider abstraction. The default "mock" provider logs no personal data. Setting
 * NOTIFICATION_PROVIDER=resend enables the provider-neutral Resend HTTP adapter; credentials and
 * a verified sender are required and delivery is still only considered live after owner testing.
 */
import { env } from "@/lib/env";
import { formatLongDate, formatTime, formatPrice } from "@/lib/datetime";

export interface NotificationMessage {
  to: string;
  subject: string;
  body: string;
}

export interface NotificationProvider {
  sendEmail(msg: NotificationMessage): Promise<void>;
  sendSms(phone: string, body: string): Promise<void>;
}

class MockNotificationProvider implements NotificationProvider {
  async sendEmail(msg: NotificationMessage): Promise<void> {
    console.info("[mock-email] Simulated delivery; no email sent.");
  }
  async sendSms(phone: string, body: string): Promise<void> {
    console.info("[mock-sms] Simulated delivery; no SMS sent.");
  }
}

class ResendNotificationProvider implements NotificationProvider {
  async sendEmail(msg: NotificationMessage): Promise<void> {
    if (!env.resendApiKey || !env.notificationFromEmail) {
      throw new Error("Resend notifications are not configured");
    }
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(10_000),
      headers: { Authorization: `Bearer ${env.resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.notificationFromEmail, to: [msg.to], subject: msg.subject, text: msg.body }),
    });
    if (!response.ok) throw new Error(`Resend returned ${response.status}`);
  }

  async sendSms(phone: string, body: string): Promise<void> {
    console.warn("[notification] SMS provider is not configured; delivery skipped.");
  }
}

export const notificationProvider: NotificationProvider = env.notificationProvider === "resend"
  ? new ResendNotificationProvider()
  : new MockNotificationProvider();

export interface BookingNotificationData {
  ref: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceName: string;
  staffName: string;
  startUtc: Date;
  endUtc: Date;
  priceCents: number;
  manageUrl: string;
  locale: string;
}

export function bookingConfirmationEmail(data: BookingNotificationData): NotificationMessage {
  const when = `${formatLongDate(data.startUtc, data.locale)} ${formatTime(data.startUtc, data.locale)}`;
  const end = formatTime(data.endUtc, data.locale);
  if (data.locale === "fr") {
    return {
      to: data.customerEmail,
      subject: `Confirmation de votre rendez-vous (${data.ref})`,
      body: [
        `Bonjour ${data.customerName},`,
        ``,
        `Votre rendez-vous est confirme :`,
        `Service : ${data.serviceName}`,
        `Specialiste : ${data.staffName}`,
        `Date : ${when} - ${end}`,
        `Prix : ${data.priceCents > 0 ? formatPrice(data.priceCents, "fr") + " CAD" : "À confirmer lors de la consultation"}`,
        ``,
        `Consultez ou annulez votre rendez-vous :`,
        `${data.manageUrl}`,
        ``,
        `Reference : ${data.ref}`,
        ``,
        `A bientot,`,
        `Maryam C Beauté`,
      ].join("\n"),
    };
  }
  return {
    to: data.customerEmail,
    subject: `Your appointment is confirmed (${data.ref})`,
    body: [
      `Hi ${data.customerName},`,
      ``,
      `Your appointment is confirmed:`,
      `Service: ${data.serviceName}`,
      `Specialist: ${data.staffName}`,
      `When: ${when} - ${end}`,
      `Price: ${data.priceCents > 0 ? formatPrice(data.priceCents, "en") + " CAD" : "Confirmed during consultation"}`,
      ``,
      `View or cancel your appointment:`,
      `${data.manageUrl}`,
      ``,
      `Reference: ${data.ref}`,
      ``,
      `See you soon,`,
      `Maryam C Beauté`,
    ].join("\n"),
  };
}

export function bookingCancelledEmail(data: {
  customerName: string; customerEmail: string; ref: string; locale: string;
}): NotificationMessage {
  if (data.locale === "fr") {
    return {
      to: data.customerEmail,
      subject: `Rendez-vous annule (${data.ref})`,
      body: [
        `Bonjour ${data.customerName},`,
        ``,
        `Votre rendez-vous ${data.ref} a ete annule comme demande.`,
        `Vous pouvez reprendre rendez-vous a tout moment sur notre site.`,
        ``,
        `A bientot,`,
        `Maryam C Beauté`,
      ].join("\n"),
    };
  }
  return {
    to: data.customerEmail,
    subject: `Appointment cancelled (${data.ref})`,
    body: [
      `Hi ${data.customerName},`,
      ``,
      `Your appointment ${data.ref} has been cancelled as requested.`,
      `You can book again any time on our website.`,
      ``,
      `See you soon,`,
      `Maryam C Beauté`,
    ].join("\n"),
  };
}

export function sendBookingNotifications(data: BookingNotificationData): Promise<void[]> {
  const email = bookingConfirmationEmail(data);
  const smsBody = data.locale === "fr"
    ? `Maryam C Beauté: rendez-vous confirmé ${formatLongDate(data.startUtc, "fr")} à ${formatTime(data.startUtc, "fr")}. Réf. ${data.ref}`
    : `Maryam C Beauté: appointment confirmed ${formatLongDate(data.startUtc, "en")} at ${formatTime(data.startUtc, "en")}. Ref ${data.ref}`;
  return Promise.all([
    notificationProvider.sendEmail(email),
    notificationProvider.sendSms(data.customerPhone, smsBody),
  ]);
}

export interface NewRequestData {
  ref: string;
  customerName: string;
  serviceName: string;
  staffName: string;
  /** Customer's preferred date/time, already localized for display */
  whenLabel: string;
  customerEmail: string;
  customerPhone: string;
  note?: string | null;
  adminEmail: string;
  /** Admin URL to the requests list */
  adminUrl: string;
  locale: string;
}

/** Alert the salon that a new request needs a decision. */
export function newRequestAdminEmail(data: NewRequestData): NotificationMessage {
  if (data.locale === "fr") {
    return {
      to: data.adminEmail,
      subject: `Nouvelle demande de rendez-vous (${data.ref})`,
      body: [
        `Nouvelle demande a confirmer :`,
        `Client : ${data.customerName}`,
        `Service : ${data.serviceName}`,
        `Specialiste : ${data.staffName}`,
        `Souhaite : ${data.whenLabel}`,
        `Email : ${data.customerEmail}`,
        `Telephone : ${data.customerPhone}`,
        data.note ? `Note : ${data.note}` : null,
        ``,
        `Confirmez ou refusez ici :`,
        `${data.adminUrl}`,
        ``,
        `Reference : ${data.ref}`,
      ].filter(Boolean).join("\n"),
    };
  }
  return {
    to: data.adminEmail,
    subject: `New appointment request (${data.ref})`,
    body: [
      `A new request needs your decision:`,
      `Customer: ${data.customerName}`,
      `Service: ${data.serviceName}`,
      `Specialist: ${data.staffName}`,
      `Requested: ${data.whenLabel}`,
      `Email: ${data.customerEmail}`,
      `Phone: ${data.customerPhone}`,
      data.note ? `Note: ${data.note}` : null,
      ``,
      `Confirm or decline here:`,
      `${data.adminUrl}`,
      ``,
      `Reference: ${data.ref}`,
    ].filter(Boolean).join("\n"),
  };
}

/** Fire-and-forget admin alert; only an email is sent (no admin phone number is stored). */
export function notifyAdminNewRequest(data: NewRequestData): Promise<void[]> {
  return Promise.all([notificationProvider.sendEmail(newRequestAdminEmail(data))]);
}

export function sendRequestReceipt(data: { customerName: string; customerEmail: string; ref: string; manageUrl: string; locale: string }): Promise<void> {
  const fr = data.locale === "fr";
  return notificationProvider.sendEmail({
    to: data.customerEmail,
    subject: fr ? `Demande reçue — ${data.ref}` : `Request received — ${data.ref}`,
    body: [fr ? `Bonjour ${data.customerName},` : `Hello ${data.customerName},`, fr ? "Votre demande a été reçue. Ce n’est pas encore un rendez-vous confirmé; le salon doit l’approuver." : "Your request was received. This is not yet a confirmed appointment; the salon must approve it.", `${fr ? "Référence" : "Reference"}: ${data.ref}`, fr ? "Consultez ou annulez votre demande :" : "View or cancel your request:", data.manageUrl, "Maryam C Beauté"].join("\n\n"),
  });
}

export interface DeclinedData {
  customerName: string;
  customerEmail: string;
  ref: string;
  reason?: string | null;
  locale: string;
}

/** Tell the customer their request was declined, with an optional reason. */
export function bookingDeclinedEmail(data: DeclinedData): NotificationMessage {
  if (data.locale === "fr") {
    return {
      to: data.customerEmail,
      subject: `Votre demande n'a pas pu etre confirmee (${data.ref})`,
      body: [
        `Bonjour ${data.customerName},`,
        ``,
        `Malheureusement nous n'avons pas pu confirmer votre demande de rendez-vous ${data.ref}.`,
        data.reason ? `Raison : ${data.reason}` : null,
        `Nous vous invitons a reprendre rendez-vous a un autre moment.`,
        ``,
        `A bientot,`,
        `Maryam C Beauté`,
      ].filter(Boolean).join("\n"),
    };
  }
  return {
    to: data.customerEmail,
    subject: `Your request could not be confirmed (${data.ref})`,
    body: [
      `Hi ${data.customerName},`,
      ``,
      `Unfortunately we could not confirm your appointment request ${data.ref}.`,
      data.reason ? `Reason: ${data.reason}` : null,
      `Please feel free to request another time.`,
      ``,
      `See you soon,`,
      `Maryam C Beauté`,
    ].filter(Boolean).join("\n"),
  };
}

export const NOTIFICATION_PROVIDER_NAME = env.notificationProvider;

export function contactMessageEmail(data: { name: string; email: string; message: string; locale: string }): NotificationMessage {
  return {
    to: env.notificationAdminEmail,
    subject: data.locale === "fr" ? `Nouveau message du site — ${data.name}` : `New website message — ${data.name}`,
    body: [
      data.locale === "fr" ? "Nouveau message reçu depuis le formulaire de contact :" : "New message received from the contact form:",
      "",
      `${data.locale === "fr" ? "Nom" : "Name"}: ${data.name}`,
      `${data.locale === "fr" ? "Courriel" : "Email"}: ${data.email}`,
      "",
      data.message,
    ].join("\n"),
  };
}

export function sendContactMessage(data: { name: string; email: string; message: string; locale: string }): Promise<void> {
  return notificationProvider.sendEmail(contactMessageEmail(data));
}
