/** Owner-supplied poster content. Treatment counts, prices and schedules are retained as supplied. */
type Copy = { en: string; fr: string };
const c = (en: string, fr: string): Copy => ({ en, fr });
type Experience = { title: Copy; points: Copy[] };
type Visit = { when: Copy; treatment: Copy; duration: Copy; interval?: Copy };
type Detail = {
  motto: Copy; story: Copy; quote: Copy; closing: Copy;
  highlights: { title: Copy; text: Copy }[];
  goals: Copy[];
  summary: Copy[];
  experiences?: Experience[];
  visits?: Visit[];
  appointmentSummary?: Copy;
  extraConcerns?: Copy[];
  offer?: Copy;
};
const matrix = c("Matrix + RF", "Matrix + RF");
const hydra = c("Signature Hydra Facial", "Hydra Facial signature");
const fourWeeks = c("4 weeks between visits", "4 semaines entre les visites");
const twoMonths = c("2 months between visits", "2 mois entre les visites");
const sixWeeks = c("6 weeks between visits", "6 semaines entre les visites");
const advancedHighlights = [
  { title: c("Advanced technology", "Technologie avancée"), text: c("Candela Matrix RF Microneedling, RF and Hydra Facial in one program.", "Microneedling RF Candela Matrix, RF et Hydra Facial dans un même programme.") },
  { title: c("Visible progress", "Progrès visibles"), text: c("Progress monitoring and follow-up throughout your journey.", "Suivi des progrès et accompagnement tout au long du parcours.") },
  { title: c("Expert care", "Soins professionnels"), text: c("Professional care, guidance and a personalized approach to your skin.", "Soins professionnels, conseils et approche personnalisée pour votre peau.") },
  { title: c("Lasting radiance", "Éclat durable"), text: c("A focus on healthier-looking, firmer skin and long-term skin health.", "Un programme axé sur une peau d’apparence saine, plus ferme et un entretien durable.") },
];
const advancedGoals = [
  c("Collagen & elastin support", "Soutien du collagène et de l’élastine"),
  c("Tighter, firmer & lifted-looking skin", "Peau d’apparence plus ferme et tonique"),
  c("Improved texture & tone", "Amélioration de la texture et du teint"),
  c("Deep hydration & radiance", "Hydratation profonde et éclat"),
  c("Reduced appearance of fine lines & wrinkles", "Atténuation de l’apparence des ridules et des rides"),
  c("Long-lasting, healthy-looking glow", "Éclat durable et peau d’apparence saine"),
];
const advancedConcerns = [c("Acne scars & skin damage", "Cicatrices d’acné et imperfections cutanées"), c("Long-term skin health", "Entretien durable de la peau")];
const month = (value: string) => c(`Month ${value}`, `Mois ${value.replace(".", ",")}`);
const matrixVisit = (value: string): Visit => ({ when: month(value), treatment: matrix, duration: c("2.5 hours", "2,5 heures"), interval: fourWeeks });
const hydraVisit = (value: string, interval: Copy): Visit => ({ when: month(value), treatment: hydra, duration: c("1.5 hours", "1,5 heure"), interval });

export const SKIN_PROGRAM_DETAILS: Record<string, Detail> = {
  discovery: {
    motto: c("Discover. Experience. Transform.", "Découvrir. Vivre. Transformer."),
    story: c("The perfect introduction to your best skin journey: three premium experiences in one personalized session.", "Le point de départ idéal de votre parcours : trois expériences premium en une séance personnalisée."),
    quote: c("Let’s create your best skin together.", "Créons ensemble votre plus belle peau."),
    closing: c("Start your skin transformation today.", "Commencez votre parcours de soins aujourd’hui."),
    offer: c("Special introductory offer for new clients only.", "Offre découverte spéciale réservée à la nouvelle clientèle."),
    highlights: [
      { title: c("Personalized for you", "Personnalisé pour vous"), text: c("AI-led evaluation and a treatment plan tailored to your skin.", "Évaluation par IA et plan de soins adapté à votre peau.") },
      { title: c("A fresh glow", "Un nouvel éclat"), text: c("Deep cleansing, gentle exfoliation and immediate hydration.", "Nettoyage en profondeur, exfoliation douce et hydratation immédiate.") },
      { title: c("Your skin type, considered", "Votre type de peau, pris en compte"), text: c("Skin assessment to personalize your care and review suitability and downtime.", "Évaluation de la peau pour personnaliser les soins et discuter de leur pertinence et de la récupération.") },
    ],
    goals: [c("A clearer understanding of your skin", "Une meilleure compréhension de votre peau"), c("Instant hydration & glow", "Hydratation et éclat immédiats"), c("A personalized next step", "Une prochaine étape personnalisée")],
    summary: [c("AI analysis + Hydra Facial + consultation", "Analyse IA + Hydra Facial + consultation")],
    experiences: [
      { title: c("Advanced AI Skin Analysis", "Analyse avancée de la peau par IA"), points: [c("AI-powered skin intelligence evaluation", "Évaluation intelligente de la peau par IA"), c("Personalized treatment plan", "Plan de soins personnalisé")] },
      { title: c("Hydra Facial Experience", "Expérience Hydra Facial"), points: [c("Deep cleansing", "Nettoyage en profondeur"), c("Gentle exfoliation", "Exfoliation douce"), c("Instant hydration & glow", "Hydratation et éclat immédiats")] },
      { title: c("Candela Matrix RF Microneedling Consultation", "Consultation de microneedling RF Candela Matrix"), points: [c("Skin assessment", "Évaluation de la peau"), c("Customized treatment mapping", "Cartographie personnalisée des soins"), c("Personalized Matrix treatment preview", "Présentation personnalisée du traitement Matrix")] },
    ],
  },
  "glow-renewal": {
    motto: c("Hydrate. Brighten. Maintain.", "Hydrater. Illuminer. Entretenir."),
    story: c("Experience healthy, hydrated and radiant-looking skin all year long with our signature Hydra Facial maintenance program.", "Profitez toute l’année d’une peau hydratée et d’apparence éclatante avec notre programme d’entretien Hydra Facial signature."),
    quote: c("Healthy skin isn’t a one-time treatment. It’s a lifestyle.", "Une peau saine ne repose pas sur un seul soin. C’est un mode de vie."),
    closing: c("Begin your glow journey today.", "Commencez votre parcours éclat aujourd’hui."),
    highlights: [
      { title: c("Professional skin care", "Soins professionnels"), text: c("Expert care to maintain your glow throughout the year.", "Un accompagnement professionnel pour entretenir votre éclat toute l’année.") },
      { title: c("Personalized AI monitoring", "Suivi personnalisé par IA"), text: c("Track your skin progress with advanced AI and before-and-after tracking.", "Suivez les progrès de votre peau grâce à l’IA et au suivi avant et après.") },
      { title: c("A regular care ritual", "Un rituel régulier"), text: c("6 signature treatments, every 2 months, across 12 months.", "6 soins signature, tous les 2 mois, sur 12 mois.") },
    ],
    goals: [c("Healthy-looking skin", "Peau d’apparence saine"), c("Hydration & radiance", "Hydratation et éclat"), c("Year-round maintenance", "Entretien tout au long de l’année")],
    summary: [c("6 Signature HydraFacial", "6 HydraFacial signature")],
    appointmentSummary: c("6 appointments · 90 minutes each · 12-month program", "6 rendez-vous · 90 minutes chacun · programme de 12 mois"),
    visits: Array.from({ length: 6 }, (_, i) => ({ when: c(`Visit ${i + 1}`, `Visite ${i + 1}`), treatment: hydra, duration: c("90 minutes", "90 minutes"), interval: twoMonths })),
  },
  essential: {
    motto: c("Prevent. Protect. Renew.", "Prévenir. Protéger. Renouveler."),
    story: c("A professionally designed program combining Candela Matrix RF Microneedling and Hydra Facial to support collagen, restore hydration and maintain healthy, youthful-looking skin.", "Un programme professionnel combinant microneedling RF Candela Matrix et Hydra Facial pour soutenir le collagène, restaurer l’hydratation et entretenir une peau d’apparence jeune et saine."),
    quote: c("Invest in your skin. Invest in your future.", "Investissez dans votre peau. Investissez dans votre avenir."),
    closing: c("Prevent early aging. Hydrate & renew.", "Prévenir les signes de l’âge. Hydrater et renouveler."),
    highlights: [
      { title: c("Prevention & maintenance", "Prévention et entretien"), text: c("Stay ahead of the appearance of fine lines and wrinkles.", "Accompagnez votre peau face à l’apparition des ridules et des rides.") },
      { title: c("Hydrate & renew", "Hydrater et renouveler"), text: c("A focus on balanced, healthy-looking and glowing skin.", "Un programme axé sur une peau équilibrée et d’apparence saine et éclatante.") },
      { title: c("Professional care", "Soins professionnels"), text: c("Advanced technology, progress monitoring and care throughout both phases.", "Technologie avancée, suivi des progrès et soins tout au long des deux phases.") },
    ],
    goals: [c("Firmer, tighter-looking skin", "Peau d’apparence plus ferme et tonique"), c("Collagen support", "Soutien du collagène"), c("Deep hydration", "Hydratation profonde"), c("Improved skin texture", "Amélioration de la texture de la peau"), c("Long-term skin health", "Entretien durable de la peau")],
    summary: [c("3 Matrix RF Microneedling", "3 microneedling RF Matrix"), c("3 Signature HydraFacial", "3 HydraFacial signature")],
    appointmentSummary: c("6 appointments · 90 minutes each · 2 phases", "6 rendez-vous · 90 minutes chacun · 2 phases"),
    visits: [
      ...["1", "2", "3"].map(value => ({ when: month(value), treatment: c("Matrix RF Microneedling", "Microneedling RF Matrix"), duration: c("90 minutes", "90 minutes"), interval: c("One treatment per month", "Un soin par mois") })),
      ...["4.5", "6", "7.5"].map(value => ({ when: month(value), treatment: hydra, duration: c("90 minutes", "90 minutes"), interval: sixWeeks })),
    ],
  },
  platinum: {
    motto: c("Rebuild. Renew. Restore. Radiate.", "Reconstruire. Renouveler. Restaurer. Rayonner."),
    story: c("A comprehensive combination of Candela Matrix RF Microneedling, RF treatments and Hydra Facial to support collagen, improve skin quality and promote long-lasting radiance.", "Une combinaison complète de microneedling RF Candela Matrix, de soins RF et de Hydra Facial pour soutenir le collagène, améliorer la qualité de la peau et favoriser un éclat durable."),
    quote: c("Advanced science. Visible results.", "Science avancée. Progrès visibles."),
    closing: c("Invest in your skin. Invest in your confidence.", "Investissez dans votre peau. Investissez dans votre confiance."),
    highlights: advancedHighlights, goals: advancedGoals, extraConcerns: advancedConcerns,
    summary: [c("3 Matrix + 3 RF", "3 Matrix + 3 RF"), c("4 Signature HydraFacial", "4 HydraFacial signature")],
    appointmentSummary: c("Matrix + RF: 2.5 hours per visit · Hydra Facial: 1.5 hours per visit", "Matrix + RF : 2,5 heures par visite · Hydra Facial : 1,5 heure par visite"),
    visits: [...["1", "2", "3"].map(matrixVisit), ...["4", "6", "8", "10", "12"].map(value => hydraVisit(value, twoMonths))],
  },
  diamond: {
    motto: c("Rebuild. Renew. Restore. Radiate.", "Reconstruire. Renouveler. Restaurer. Rayonner."),
    story: c("Our most comprehensive program combines Candela Matrix RF Microneedling, RF treatments and HydraFacial to support collagen, restore skin health and reveal your most radiant-looking skin.", "Notre programme le plus complet combine microneedling RF Candela Matrix, soins RF et HydraFacial pour soutenir le collagène, entretenir la santé de la peau et révéler son éclat."),
    quote: c("Advanced science. Visible results. Lasting confidence.", "Science avancée. Progrès visibles. Confiance durable."),
    closing: c("Invest in your skin. Invest in your confidence.", "Investissez dans votre peau. Investissez dans votre confiance."),
    highlights: advancedHighlights, goals: advancedGoals, extraConcerns: advancedConcerns,
    summary: [c("5 Matrix + 5 RF", "5 Matrix + 5 RF"), c("5 Signature HydraFacial", "5 HydraFacial signature")],
    appointmentSummary: c("10 appointments · 15 treatments · two complementary phases", "10 rendez-vous · 15 soins · deux phases complémentaires"),
    visits: [...["1", "2", "3", "4", "5"].map(matrixVisit), ...["6.5", "8", "9.5", "11", "12.5"].map(value => hydraVisit(value, sixWeeks))],
  },
};

/** Localize structured copy without duplicating the presentation or losing any poster detail. */
export function skinProgramDetails(slug: string, locale: string) {
  const detail = SKIN_PROGRAM_DETAILS[slug];
  if (!detail) return undefined;
  const read = (copy: Copy) => locale === "fr" ? copy.fr : copy.en;
  return {
    motto: read(detail.motto), story: read(detail.story), quote: read(detail.quote), closing: read(detail.closing),
    offer: detail.offer && read(detail.offer),
    highlights: detail.highlights.map(h => ({ title: read(h.title), text: read(h.text) })),
    goals: detail.goals.map(read), extraConcerns: detail.extraConcerns?.map(read) ?? [],
    summary: detail.summary.map(read),
    experiences: detail.experiences?.map(e => ({ title: read(e.title), points: e.points.map(read) })),
    appointmentSummary: detail.appointmentSummary && read(detail.appointmentSummary),
    visits: detail.visits?.map(v => ({ when: read(v.when), treatment: read(v.treatment), duration: read(v.duration), interval: v.interval && read(v.interval) })),
  };
}
