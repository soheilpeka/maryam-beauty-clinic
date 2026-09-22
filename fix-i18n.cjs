const fs = require("fs");

function insertAfter(obj, afterKey, newKey, newVal) {
  const out = {};
  for (const k of Object.keys(obj)) {
    out[k] = obj[k];
    if (k === afterKey) out[newKey] = newVal;
  }
  if (!(newKey in out)) out[newKey] = newVal;
  return out;
}
function insertBefore(obj, beforeKey, newKey, newVal) {
  const out = {};
  for (const k of Object.keys(obj)) {
    if (k === beforeKey) out[newKey] = newVal;
    out[k] = obj[k];
  }
  if (!(newKey in out)) out[newKey] = newVal;
  return out;
}

const ADD = {
  en: {
    Sections: {
      title: "Experience the Best of Beauty Treatments",
      subtitle: "Personalized aesthetic care designed to help you look and feel your best.",
      hoursLabel: "Opening hours",
    },
    Nav: { clinic: "Clinic" },
    Admin: { signInHint: "Sign in to manage bookings, services and staff." },
    Validation: {
      email: { invalid: "Please enter a valid email address." },
      password: { min: "Password must be at least 8 characters." },
    },
  },
  fr: {
    Sections: {
      title: "Vivez le meilleur des traitements de beauté",
      subtitle: "Soins esthétiques personnalisés, conçus pour vous aider à vous sentir et à paraître au mieux.",
      hoursLabel: "Horaires d'ouverture",
    },
    Nav: { clinic: "Clinique" },
    Admin: { signInHint: "Connectez-vous pour gérer les réservations, les services et le personnel." },
    Validation: {
      email: { invalid: "Veuillez saisir une adresse courriel valide." },
      password: { min: "Le mot de passe doit comporter au moins 8 caractères." },
    },
  },
};

for (const locale of ["en", "fr"]) {
  const file = `messages/${locale}.json`;
  const msg = JSON.parse(fs.readFileSync(file, "utf8"));
  const add = ADD[locale];

  // Sections: title/subtitle at the very top (hero), hoursLabel at the end.
  msg.Sections = insertBefore(msg.Sections, "philosophyEyebrow", "title", add.Sections.title);
  msg.Sections = insertAfter(msg.Sections, "title", "subtitle", add.Sections.subtitle);
  msg.Sections = insertAfter(msg.Sections, "areasTitle", "hoursLabel", add.Sections.hoursLabel);

  // Nav.clinic right after contact.
  msg.Nav = insertAfter(msg.Nav, "contact", "clinic", add.Nav.clinic);

  // Admin.signInHint right after signIn.
  msg.Admin = insertAfter(msg.Admin, "signIn", "signInHint", add.Admin.signInHint);

  // Validation: email/password become objects holding nested message keys.
  msg.Validation.email = add.Validation.email;
  msg.Validation.password = add.Validation.password;

  fs.writeFileSync(file, JSON.stringify(msg, null, 2));
  console.log("updated " + file);
}
