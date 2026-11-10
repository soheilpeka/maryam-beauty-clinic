import { describe, expect, it } from "vitest";
import { contactMessageEmail } from "@/lib/notifications";

describe("contact notifications", () => {
  it.each([
    { locale: "en", expected: "Phone: +1 (514) 555-0199" },
    { locale: "fr", expected: "Téléphone: +1 (514) 555-0199" },
  ])("includes the customer's phone number in the $locale salon email", ({ locale, expected }) => {
    const email = contactMessageEmail({
      name: "Alex Doe",
      email: "alex@example.com",
      phone: "+1 (514) 555-0199",
      message: "Please tell me more about your services.",
      locale,
    });

    expect(email.body).toContain(expected);
  });
});
