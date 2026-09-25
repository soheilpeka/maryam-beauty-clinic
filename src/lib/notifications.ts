/**
 * Notification provider abstraction. The default "mock" provider logs to the console; swap it by
 * setting NOTIFICATION_PROVIDER and implementing a real provider here. No real email/SMS is sent.
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
    console.info(`[mock-email] to=${msg.to} subject=${msg.subject}\n${msg.body}`);
  }
  async sendSms(phone: string, body: string): Promise<void> {
    console.info(`[mock-sms] to=${phone}: ${body}`);
  }
}

export const notificationProvider: NotificationProvider = new MockNotificationProvider();

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
        `Prix : ${formatPrice(data.priceCents, "fr")} CAD`,
        ``,
        `Gelez votre rendez-vous, modifiez ou annulez-le :`,
        `${data.manageUrl}`,
        ``,
        `Reference : ${data.ref}`,
        ``,
        `A bientot,`,
        `Maryam Beauty Clinic`,
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
      `Price: ${formatPrice(data.priceCents, "en")} CAD`,
      ``,
      `View or cancel your appointment:`,
      `${data.manageUrl}`,
      ``,
      `Reference: ${data.ref}`,
      ``,
      `See you soon,`,
      `Maryam Beauty Clinic`,
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
        `Maryam Beauty Clinic`,
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
      `Maryam Beauty Clinic`,
    ].join("\n"),
  };
}

export function sendBookingNotifications(data: BookingNotificationData): Promise<void[]> {
  const email = bookingConfirmationEmail(data);
  const smsBody = data.locale === "fr"
    ? `Maryam Beauty Clinic: rendez-vous confirme ${formatLongDate(data.startUtc, "fr")} a ${formatTime(data.startUtc, "fr")}. Ref ${data.ref}`
    : `Maryam Beauty Clinic: appointment confirmed ${formatLongDate(data.startUtc, "en")} at ${formatTime(data.startUtc, "en")}. Ref ${data.ref}`;
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
        `Confirerez ou refusez ici :`,
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
        `Maryam Beauty Clinic`,
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
      `Maryam Beauty Clinic`,
    ].filter(Boolean).join("\n"),
  };
}

export const NOTIFICATION_PROVIDER_NAME = env.notificationProvider;