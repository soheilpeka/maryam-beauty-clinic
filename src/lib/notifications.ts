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
      `View, reschedule, or cancel your appointment:`,
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

export const NOTIFICATION_PROVIDER_NAME = env.notificationProvider;