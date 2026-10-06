import type { ServiceDetail } from "@/lib/content/services";
import { OWNER_SERVICE_COPY } from "@/lib/content/owner-service-copy";

type BilingualCopy = {
  summary: string;
  summaryFr: string;
  detail: ServiceDetail;
  detailFr: ServiceDetail;
};
type ParsedServiceDescription = { summary: string; detail?: ServiceDetail };

/** Polished service copy informed by professional and manufacturer guidance. */
export const SERVICE_COPY: Record<string, BilingualCopy> = {
  "laser-hair-removal": {
    summary: "Enjoy a smoother-looking finish with a laser hair-removal plan tailored to your skin, hair and preferred treatment areas.",
    summaryFr: "Profitez d’une peau d’apparence plus lisse grâce à un plan d’épilation au laser adapté à votre peau, à vos poils et aux zones souhaitées.",
    detail: { tagline: "Smooth skin, thoughtfully personalized.", paragraphs: ["Laser hair removal uses focused light to target hair at the root. Your specialist takes time to understand your skin and hair characteristics and the areas you would like to treat.", "Your visit begins with a personal consultation, followed by clear preparation and aftercare guidance for a comfortable, considered experience."], highlights: ["A plan tailored to your skin and hair", "Treatment areas chosen around your goals", "Personal guidance before and after your visit"] },
    detailFr: { tagline: "Une peau douce, pensée pour vous.", paragraphs: ["L’épilation au laser utilise une lumière ciblée pour agir à la racine du poil. Votre spécialiste prend le temps de connaître votre peau, vos poils et les zones que vous souhaitez traiter.", "Votre visite commence par une consultation personnalisée, suivie de conseils clairs avant et après le soin pour une expérience tout en douceur."], highlights: ["Un plan adapté à votre peau et à vos poils", "Des zones choisies selon vos objectifs", "Des conseils personnalisés avant et après le soin"] },
  },
  "vein-removal-treatment": {
    summary: "A personalized aesthetic consultation focused on the look of visible veins and a refined, even-looking finish for your chosen area.",
    summaryFr: "Une consultation esthétique personnalisée pour sublimer l’apparence des veinules visibles et révéler un fini plus uniforme sur la zone souhaitée.",
    detail: { tagline: "A more even-looking finish, tailored to you.", paragraphs: ["Begin with a one-to-one conversation about the area you would like to refresh and the look you have in mind. Your specialist will explain the available aesthetic approach and shape the visit around your needs.", "Every appointment is personal, with time to discuss your preferences, the treatment area and the care that helps you feel comfortable throughout."], highlights: ["Focused on the area you choose", "A personalized aesthetic consultation", "Care and comfort considered throughout"] },
    detailFr: { tagline: "Un fini plus uniforme, pensé pour vous.", paragraphs: ["La visite commence par une conversation personnalisée sur la zone que vous souhaitez embellir et le résultat esthétique que vous imaginez. Votre spécialiste vous présente l’approche proposée et adapte le rendez-vous à vos besoins.", "Chaque rendez-vous est unique : vos préférences, la zone ciblée et votre confort sont au cœur de l’expérience."], highlights: ["Une attention portée à la zone de votre choix", "Une consultation esthétique personnalisée", "Votre confort au cœur du soin"] },
  },
  hydrafacial: {
    summary: "A refreshing, multi-step facial that cleanses, exfoliates, extracts and hydrates for a fresh, luminous-looking complexion.",
    summaryFr: "Un soin du visage rafraîchissant en plusieurs étapes qui nettoie, exfolie, extrait et hydrate pour une peau d’apparence fraîche et lumineuse.",
    detail: { tagline: "A fresh, dewy moment for your skin.", paragraphs: ["Enjoy a thoughtfully layered facial experience that brings together cleansing, gentle exfoliation, pore care and hydration. Each step is designed to leave your skin feeling refreshed and beautifully cared for.", "Your specialist can personalize the experience with available options and share simple ways to keep your at-home skin-care ritual feeling just as special."], highlights: ["A refreshing, multi-step facial", "A fresh and hydrated-looking finish", "Personalized options for your skin-care ritual"] },
    detailFr: { tagline: "Un moment frais et lumineux pour votre peau.", paragraphs: ["Savourez un soin du visage en plusieurs étapes qui réunit nettoyage, exfoliation douce, soin des pores et hydratation. Chaque geste est pensé pour une peau fraîche et délicatement choyée.", "Votre spécialiste peut personnaliser le soin avec les options proposées et vous partager de petites attentions à intégrer à votre rituel beauté à la maison."], highlights: ["Un soin du visage rafraîchissant en plusieurs étapes", "Une peau d’apparence fraîche et hydratée", "Des options personnalisées pour votre rituel beauté"] },
  },
  "deep-cleansing-facials": {
    summary: "A refreshing deep-cleansing facial customized around your skin-care ritual, with a clean, soft and revitalized-looking finish in mind.",
    summaryFr: "Un soin nettoyant en profondeur personnalisé autour de votre rituel beauté, pour une peau d’apparence nette, douce et revitalisée.",
    detail: { tagline: "A clean-slate feeling, made personal.", paragraphs: ["Set aside a moment for a carefully tailored facial focused on cleansing, comfort and a refreshed appearance. Your specialist can adapt the products and steps to your preferences and skin-care routine.", "Enjoy a calm, restorative visit and leave with thoughtful suggestions for keeping your daily skin-care ritual simple and satisfying."], highlights: ["A facial shaped around your routine", "A fresh, clean-feeling complexion", "Relaxed care with personal attention"] },
    detailFr: { tagline: "Une sensation de peau nette, rien que pour vous.", paragraphs: ["Offrez-vous un soin du visage personnalisé, centré sur le nettoyage, le confort et une apparence fraîche. Votre spécialiste adapte les produits et les étapes à vos préférences et à votre rituel beauté.", "Profitez d’un moment apaisant et repartez avec des suggestions attentionnées pour garder une routine quotidienne simple et agréable."], highlights: ["Un soin adapté à votre routine", "Une sensation de peau fraîche et nette", "Une attention personnalisée dans une ambiance apaisante"] },
  },
  "ai-skin-analysis": {
    summary: "Discover your skin in a new way with a guided complexion analysis that highlights visible details and helps personalize your beauty routine.",
    summaryFr: "Découvrez votre peau autrement grâce à une analyse guidée du teint qui révèle ses caractéristiques visibles et aide à personnaliser votre rituel beauté.",
    detail: { tagline: "A closer look at your skin’s unique story.", paragraphs: ["A detailed complexion image can bring visible features such as tone, texture, pores and spots into focus. It creates an engaging starting point for a more personalized conversation about your skin-care goals.", "Explore the results with your specialist and build a beauty routine around the areas you would most like to celebrate and care for."], highlights: ["See visible complexion details up close", "A personal starting point for skin care", "Recommendations shaped around your goals"] },
    detailFr: { tagline: "Un regard attentif sur l’histoire unique de votre peau.", paragraphs: ["Une image détaillée du teint met en lumière des caractéristiques visibles comme le ton, la texture, les pores et les taches. C’est un point de départ captivant pour une discussion personnalisée autour de vos objectifs beauté.", "Explorez les images avec votre spécialiste et imaginez un rituel adapté aux aspects de votre peau que vous souhaitez mettre en valeur et choyer."], highlights: ["Observer les détails visibles du teint", "Un point de départ personnalisé pour vos soins", "Des suggestions selon vos objectifs"] },
  },
  "rf-skin-treatment": {
    summary: "A modern radiofrequency facial experience designed to complement your skin-care ritual and promote a smoother, more refreshed-looking complexion.",
    summaryFr: "Un soin du visage moderne à la radiofréquence, pensé pour enrichir votre rituel beauté et révéler une peau d’apparence plus lisse et reposée.",
    detail: { tagline: "A modern touch for your skin-care ritual.", paragraphs: ["Enjoy a personalized introduction to radiofrequency skin care, with attention to the look and feel you would like to achieve. Your specialist explains the device and shapes the experience around your treatment area and preferences.", "A thoughtful consultation helps create a comfortable visit and a skin-care plan that feels aligned with your goals."], highlights: ["A contemporary skin-care experience", "Personalized around your preferred treatment area", "A considered plan for your beauty goals"] },
    detailFr: { tagline: "Une touche moderne à votre rituel beauté.", paragraphs: ["Découvrez un soin de la peau à la radiofréquence personnalisé, pensé selon l’apparence et la sensation recherchées. Votre spécialiste vous présente l’appareil et adapte le rendez-vous à la zone souhaitée et à vos préférences.", "Une consultation attentionnée aide à créer une expérience agréable et un plan beauté qui vous ressemble."], highlights: ["Une expérience beauté contemporaine", "Un soin personnalisé selon la zone souhaitée", "Un plan réfléchi pour vos objectifs beauté"] },
  },
  "rf-microneedling": {
    summary: "A refined skin-renewal experience pairing radiofrequency with microneedling to support smoother-looking texture and a fresh, radiant appearance.",
    summaryFr: "Un soin de renouvellement raffiné qui associe radiofréquence et microneedling pour favoriser une peau d’apparence plus lisse, fraîche et lumineuse.",
    detail: { tagline: "A fresh perspective on skin renewal.", paragraphs: ["RF microneedling combines microneedling with radiofrequency energy in a precision-focused skin-care experience. It is designed to support a smoother-looking texture and a refreshed complexion.", "Your specialist will talk through your skin goals, explain the device used and personalize the appointment and aftercare guidance for a considered, comfortable experience."], highlights: ["Radiofrequency and microneedling in one experience", "Focused on a smoother-looking skin texture", "Personalized consultation and aftercare"] },
    detailFr: { tagline: "Une nouvelle approche du renouveau de la peau.", paragraphs: ["Le microneedling RF associe microneedling et énergie de radiofréquence dans un soin de précision. Il est pensé pour favoriser une texture d’apparence plus lisse et un teint frais.", "Votre spécialiste échange avec vous sur vos objectifs beauté, présente l’appareil utilisé et personnalise le rendez-vous ainsi que les conseils après le soin pour une expérience attentionnée."], highlights: ["Radiofréquence et microneedling réunis", "Une texture de peau d’apparence plus lisse", "Consultation et conseils personnalisés"] },
  },
  microneedling: {
    summary: "A personalized skin-renewal treatment designed to encourage a smoother-looking texture and a fresh, healthy-looking glow.",
    summaryFr: "Un soin de renouvellement personnalisé, pensé pour favoriser une texture d’apparence plus lisse et un éclat frais et naturel.",
    detail: { tagline: "A fresh glow, thoughtfully renewed.", paragraphs: ["Microneedling is a precision skin-care treatment that supports the look of refined texture and a more radiant complexion. Your treatment plan is tailored around your skin goals and preferences.", "Your specialist will walk you through the appointment and share personalized preparation and aftercare guidance, so every step feels clear and considered."], highlights: ["Focused on a smoother-looking texture", "Personalized to your skin-care goals", "Guidance for a thoughtful treatment experience"] },
    detailFr: { tagline: "Un éclat frais, délicatement renouvelé.", paragraphs: ["Le microneedling est un soin de précision qui aide à révéler une texture d’apparence affinée et un teint plus lumineux. Votre plan est adapté à vos objectifs beauté et à vos préférences.", "Votre spécialiste vous explique le déroulement et vous partage des conseils personnalisés avant et après le soin pour une expérience claire et attentionnée."], highlights: ["Une texture d’apparence plus lisse", "Un soin adapté à vos objectifs beauté", "Des conseils personnalisés à chaque étape"] },
  },
  "microblading-eyebrow-shaping": {
    summary: "Wake up to beautifully defined brows shaped around your natural features, preferred fullness and signature style.",
    summaryFr: "Réveillez-vous avec des sourcils joliment définis, dessinés selon vos traits naturels, le volume souhaité et votre style.",
    detail: { tagline: "Your features, beautifully framed.", paragraphs: ["Microblading creates the look of softly defined brow hairs with pigment chosen to complement your colouring. Your appointment begins with a personalized shape and shade consultation to find a finish that feels like you.", "Enjoy a considered brow design, clear guidance through the service and tailored aftercare for a polished look that fits your everyday routine."], highlights: ["Shape designed around your features", "Colour selected to complement your look", "Personalized aftercare guidance"] },
    detailFr: { tagline: "Vos traits, joliment mis en valeur.", paragraphs: ["Le microblading crée l’apparence de poils délicatement définis à l’aide d’un pigment choisi pour harmoniser votre teint. La visite commence par une consultation personnalisée sur la forme et la couleur pour trouver un résultat qui vous ressemble.", "Profitez d’un dessin des sourcils réfléchi, d’explications claires et de conseils après le soin adaptés à votre quotidien."], highlights: ["Une forme pensée selon vos traits", "Une couleur qui sublime votre teint", "Des conseils personnalisés après le soin"] },
  },
  "lip-blush-dark-lip-neutralization": {
    summary: "Enhance your natural lip colour with a soft, beautifully balanced tint tailored to your undertone and preferred finish.",
    summaryFr: "Sublimez la couleur naturelle de vos lèvres avec une teinte douce et harmonieuse, adaptée à votre sous-ton et au fini souhaité.",
    detail: { tagline: "A little colour, a lovely difference.", paragraphs: ["Lip blush brings a fresh wash of colour to the lips, with tones selected to complement your natural colouring and personal style. A one-to-one consultation helps explore shades and the look you would love to wear.", "Your specialist will explain the appointment and share personalized aftercare guidance as your lip colour settles into its soft, lasting-looking finish."], highlights: ["Colour tailored to your undertone", "A soft, polished-looking lip finish", "Personal shade consultation and aftercare"] },
    detailFr: { tagline: "Une touche de couleur, tout en douceur.", paragraphs: ["Le lip blush dépose un voile de couleur frais sur les lèvres, dans des tons choisis pour harmoniser votre carnation et votre style. Une consultation personnalisée permet d’explorer les nuances et le fini que vous aimez.", "Votre spécialiste vous présente le déroulement et vous partage des conseils personnalisés pour accompagner la couleur pendant qu’elle révèle un fini doux et harmonieux."], highlights: ["Une couleur adaptée à votre sous-ton", "Des lèvres d’apparence douce et soignée", "Consultation couleur et conseils personnalisés"] },
  },
  haircuts: {
    summary: "A thoughtful cut shaped around your features, hair texture, daily routine and the movement you want, with a plan you can feel comfortable wearing.",
    summaryFr: "Une coupe pensée selon vos traits, votre texture, votre quotidien et le mouvement souhaité, pour créer une forme que vous aimez porter.",
    detail: { tagline: "A cut that belongs in your everyday life.", paragraphs: ["Bring a reference if you have one, and tell your stylist how you usually wear and care for your hair. The conversation helps align length, shape, fringe and styling with your routine.", "Your stylist can talk through what is achievable with your current length and texture, then refine the plan before the first cut."], highlights: ["Consultation about shape and length", "Texture and styling habits considered", "A look planned around your routine"] },
    detailFr: { tagline: "Une coupe qui trouve sa place au quotidien.", paragraphs: ["Apportez une inspiration si vous en avez et décrivez à votre coiffeuse votre routine habituelle. La discussion permet d’harmoniser la longueur, la forme, la frange et le coiffage avec votre quotidien.", "Votre coiffeuse peut expliquer ce qui est réalisable selon votre longueur et votre texture, puis préciser le plan avant de commencer."], highlights: ["Discussion de la forme et de la longueur", "Texture et habitudes de coiffage prises en compte", "Un style pensé pour votre quotidien"] },
  },
  "hair-colour-balayage": {
    summary: "Refresh your look with dimensional colour or balayage, thoughtfully planned around your inspiration and personal style.",
    summaryFr: "Renouvelez votre style avec une couleur dimensionnelle ou un balayage, pensé selon vos inspirations et votre personnalité.",
    detail: { tagline: "Beautiful dimension, made personal.", paragraphs: ["Create a colour look that feels unmistakably yours. From luminous balayage to a rich, dimensional shade, your stylist plans tones and placement around your inspiration, natural colouring and preferred upkeep.", "Share the looks you love and enjoy a clear conversation about the colour journey, finishing touches and simple ways to care for your new look."], highlights: ["Custom colour placement and tone", "Inspired by your style and references", "A personalized plan for colour care"] },
    detailFr: { tagline: "De beaux reflets, rien qu’à vous.", paragraphs: ["Créez une couleur qui vous ressemble. D’un balayage lumineux à une teinte riche et dimensionnelle, votre styliste imagine les tons et leur placement selon vos inspirations, votre carnation et l’entretien souhaité.", "Partagez les styles que vous aimez et profitez d’une discussion claire sur le parcours couleur, les finitions et les gestes simples pour prendre soin de votre nouveau look."], highlights: ["Placement et nuances personnalisés", "Inspirés de votre style et de vos références", "Un plan de soin couleur adapté"] },
  },
  "hair-botox-hydration": {
    summary: "Give your hair a silky, hydrated-looking finish with a smoothing and conditioning ritual shaped around your hair goals.",
    summaryFr: "Offrez à vos cheveux un fini soyeux et hydraté grâce à un rituel lissant et revitalisant pensé selon vos envies.",
    detail: { tagline: "Softer-looking hair, beautifully refreshed.", paragraphs: ["This deep-conditioning and smoothing service is designed to leave hair feeling soft, polished and easy to style. Your stylist chooses an approach around your texture, colour history and the finish you have in mind.", "Enjoy a personalized hair-care moment and leave with simple tips to keep your strands looking smooth, glossy and beautifully cared for."], highlights: ["A soft, smooth-looking finish", "Personalized to your hair texture and style", "Tips for glossy-looking hair at home"] },
    detailFr: { tagline: "Des cheveux visiblement soyeux et sublimés.", paragraphs: ["Ce soin revitalisant et lissant est pensé pour des cheveux doux, soignés et faciles à coiffer. Votre styliste choisit une approche adaptée à votre texture, à votre couleur et au fini souhaité.", "Profitez d’un moment de soin personnalisé et repartez avec des conseils simples pour garder une chevelure lisse, brillante et joliment entretenue."], highlights: ["Un fini d’apparence douce et lisse", "Un soin adapté à votre texture et à votre style", "Des conseils pour une chevelure brillante à la maison"] },
  },
  "swedish-relaxation-massage": {
    summary: "Slow down with a soothing Swedish-style massage shaped around your preferred pressure, focus areas and ideal moment of calm.",
    summaryFr: "Ralentissez le rythme avec un massage suédois apaisant, adapté à la pression souhaitée, aux zones ciblées et à votre envie de détente.",
    detail: { tagline: "Unwind, exhale, and enjoy the moment.", paragraphs: ["Let the day soften with flowing Swedish-style massage techniques, including gentle gliding and kneading movements. Your therapist personalizes the pace and focus to create a relaxing experience just for you.", "From the first welcome to the final quiet moment, the session is designed to help you pause, settle in and enjoy attentive care."], highlights: ["Flowing, soothing massage techniques", "Pressure and focus personalized for you", "A calm pause dedicated to your well-being"] },
    detailFr: { tagline: "Détendez-vous et savourez l’instant.", paragraphs: ["Laissez le rythme ralentir grâce à des mouvements fluides inspirés du massage suédois, comme l’effleurage et le pétrissage. Votre thérapeute adapte le rythme et les zones ciblées pour créer un moment de détente qui vous ressemble.", "De l’accueil au dernier instant de calme, cette séance vous invite à faire une pause et à profiter d’une attention tout en douceur."], highlights: ["Des mouvements fluides et apaisants", "Pression et zones ciblées personnalisées", "Une pause consacrée à votre bien-être"] },
  },
  "lash-brow-lamination": {
    summary: "Open up your eyes with beautifully lifted lashes and softly sculpted brows, customized to your natural features and favorite look.",
    summaryFr: "Illuminez votre regard avec des cils joliment rehaussés et des sourcils délicatement sculptés, adaptés à vos traits et au style aimé.",
    detail: { tagline: "Your natural beauty, beautifully framed.", paragraphs: ["A lash lift brings a graceful curve to natural lashes, while brow lamination creates a fuller, more polished-looking shape. Together, they create a bright, defined look with an effortless feel.", "Your specialist personalizes the finish to your features and shares easy aftercare tips to help you enjoy your refreshed look."], highlights: ["Lashes with a graceful lifted look", "Brows styled for a fuller-looking finish", "A personalized shape and simple aftercare"] },
    detailFr: { tagline: "Votre beauté naturelle, joliment mise en valeur.", paragraphs: ["Le rehaussement dessine une jolie courbe aux cils naturels, tandis que la lamination donne aux sourcils une forme plus fournie et soignée. Ensemble, ils créent un regard lumineux et défini, tout en légèreté.", "Votre spécialiste personnalise le fini selon vos traits et vous partage des conseils faciles pour profiter pleinement de votre nouveau regard."], highlights: ["Des cils joliment rehaussés", "Des sourcils d’apparence plus fournie", "Une forme personnalisée et des conseils simples"] },
  },
  "laser-skin-rejuvenation": {
    summary: "Reveal a brighter-looking complexion with a personalized laser or light-based skin-rejuvenation experience tailored to your beauty goals.",
    summaryFr: "Révélez un teint d’apparence plus lumineux grâce à un soin de rajeunissement au laser ou à la lumière, adapté à vos objectifs beauté.",
    detail: { tagline: "A brighter-looking complexion, beautifully considered.", paragraphs: ["Laser and light-based skin care can be tailored to different complexion goals, from a more even-looking tone to a refreshed, radiant appearance. Your specialist personalizes the approach around your skin and the look you have in mind.", "Enjoy a detailed consultation, a clear introduction to the technology and thoughtful guidance for preparing for and caring for your skin after the visit."], highlights: ["A refreshed, radiant-looking complexion", "A plan shaped around your skin and goals", "Personal guidance before and after the visit"] },
    detailFr: { tagline: "Un teint plus lumineux, pensé avec soin.", paragraphs: ["Les soins de la peau au laser ou à la lumière peuvent s’adapter à différents objectifs beauté, d’un teint d’apparence plus uniforme à une peau fraîche et lumineuse. Votre spécialiste personnalise l’approche selon votre peau et le résultat souhaité.", "Profitez d’une consultation détaillée, d’une présentation claire de la technologie et de conseils attentionnés pour préparer et choyer votre peau après le rendez-vous."], highlights: ["Un teint d’apparence fraîche et lumineuse", "Un plan adapté à votre peau et à vos objectifs", "Des conseils personnalisés avant et après le soin"] },
  },
};

const OWNER_COPY_SLUGS = Object.keys(OWNER_SERVICE_COPY);
export const LEGACY_FULL_SERVICE_DESCRIPTIONS: Record<string, { en: string; fr: string }> = Object.fromEntries(
  OWNER_COPY_SLUGS.map((slug) => {
    const old = SERVICE_COPY[slug];
    const build = (locale: "en" | "fr") => {
      const summary = locale === "fr" ? old.summaryFr : old.summary;
      const detail = locale === "fr" ? old.detailFr : old.detail;
      const value = [summary, ...detail.paragraphs].join("\n\n");
      if (locale === "fr" || value.length <= 500) return value;
      const limit = value.lastIndexOf(" ", 500);
      return value.slice(0, limit > 0 ? limit : 500);
    };
    return [slug, { en: build("en"), fr: build("fr") }];
  }),
);

function normalizeHeading(value: string) {
  return value.replace(/^#+\s*/, "").trim().replace(/[:?？]+$/, "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("en").replace(/[’']/g, "'");
}

const headingAliases: Record<string, string> = Object.fromEntries([
  ["Preview", "preview"], ["Aperçu", "preview"],
  ["Service Description", "description"], ["Description du service", "description"],
  ["Treatment Highlights", "highlights"], ["Points forts du traitement", "highlights"], ["Points forts du service", "highlights"], ["Points forts du soin", "highlights"],
  ["A Personal Approach", "approach"], ["Une approche personnalisée", "approach"],
  ["Duration", "duration"], ["Durée", "duration"],
  ["What can I expect?", "faq"], ["À quoi puis-je m’attendre?", "faq"],
  ["How can I care for my skin after my visit?", "faq"], ["Comment prendre soin de ma peau après le rendez-vous?", "faq"],
  ["How many visits should I plan?", "faq"], ["Combien de visites dois-je prévoir?", "faq"], ["Combien de séances dois-je prévoir?", "faq"],
  ["Can I track my progress?", "faq"], ["Puis-je suivre l’évolution de ma peau?", "faq"],
  ["Request an appointment", "booking"], ["Demander un rendez-vous", "booking"],
].map(([heading, key]) => [normalizeHeading(heading!), key!]));

export function parseServiceDescription(slug: string, text: string | null | undefined, locale: "en" | "fr"): ParsedServiceDescription | undefined {
  if (!text?.trim()) return undefined;
  const sections = new Map<string, string[]>();
  const faqHeadings = new Map<string, string>();
  let sectionKey = "description";
  let faqQuestion = "";
  for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
    const normalized = normalizeHeading(line);
    const mapped = headingAliases[normalized];
    if (mapped) {
      if (mapped === "faq") {
        faqQuestion = line.replace(/^#+\s*/, "").trim().replace(/[?？]+$/, "?");
        sectionKey = `faq:${faqQuestion}`;
        faqHeadings.set(sectionKey, faqQuestion);
      } else {
        sectionKey = mapped;
        faqQuestion = "";
      }
      if (!sections.has(sectionKey)) sections.set(sectionKey, []);
      continue;
    }
    if (!sections.has(sectionKey)) sections.set(sectionKey, []);
    sections.get(sectionKey)!.push(line);
  }
  const content = (key: string) => (sections.get(key) ?? []).join("\n").trim();
  const blocks = (value: string) => value.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  const list = (value: string) => value.split("\n").map((part) => part.trim().replace(/^[-*•]\s*/, "")).filter(Boolean);
  const summary = content("preview");
  const description = content("description");
  const highlightLines = content("highlights");
  const approachLines = blocks(content("approach"));
  const faqs = [...faqHeadings.entries()].map(([key, question]) => ({ question, answer: content(key) })).filter((faq) => faq.answer);
  const structured = sections.has("preview") || sections.has("highlights") || sections.has("approach") || sections.has("duration") || faqs.length > 0 || sections.has("booking");
  if (!structured) {
    const paragraphs = blocks(text);
    const copy = SERVICE_COPY[slug];
    const fullDefault = fullServiceDescription(slug, locale);
    if (copy && text === fullDefault) return { summary: locale === "fr" ? copy.summaryFr : copy.summary, detail: locale === "fr" ? copy.detailFr : copy.detail };
    return { summary: paragraphs[0] ?? "", detail: paragraphs.length > 1 ? { paragraphs: paragraphs.slice(1) } : undefined };
  }
  const detail: ServiceDetail = {
    paragraphs: blocks(description),
    highlights: highlightLines ? list(highlightLines) : undefined,
    highlightsTitle: sections.has("highlights") ? (locale === "fr" ? "Points forts du soin" : "Treatment Highlights") : undefined,
    personalApproachTitle: approachLines[0],
    personalApproach: approachLines.slice(1),
    durationText: content("duration") || undefined,
    faqs: faqs.length ? faqs : undefined,
    bookingPrompt: content("booking") || undefined,
    customSections: true,
  };
  return { summary: summary || blocks(description)[0] || "", detail };
}

for (const [slug, copy] of Object.entries(OWNER_SERVICE_COPY)) {
  const en = parseServiceDescription(slug, copy.en, "en")!;
  const fr = parseServiceDescription(slug, copy.fr, "fr")!;
  SERVICE_COPY[slug] = {
    summary: en.summary,
    summaryFr: fr.summary,
    detail: en.detail ?? { paragraphs: [] },
    detailFr: fr.detail ?? { paragraphs: [] },
  };
}

/** Exact previous placeholders, used only to upgrade untouched database descriptions. */
export const LEGACY_SERVICE_SUMMARIES: Record<string, { en: string; fr: string }> = {
  "laser-hair-removal": { en: "A personalized laser hair-removal plan shaped around the treatment area, skin assessment and your comfort.", fr: "Un plan d’épilation au laser personnalisé selon la zone, l’évaluation de la peau et votre confort." },
  "vein-removal-treatment": { en: "A consultation-led service to assess visible superficial veins and discuss appropriate treatment options.", fr: "Un service guidé par une consultation pour évaluer les veinules superficielles visibles et discuter des options appropriées." },
  hydrafacial: { en: "A multi-step facial experience selected around your skin’s current needs, goals and comfort.", fr: "Une expérience faciale en plusieurs étapes choisie selon les besoins actuels de votre peau, vos objectifs et votre confort." },
  "deep-cleansing-facials": { en: "A considered deep-cleansing facial tailored after a conversation about your skin and daily routine.", fr: "Un soin nettoyant en profondeur adapté après une discussion sur votre peau et votre routine quotidienne." },
  "ai-skin-analysis": { en: "A guided skin analysis that supports a clearer, more informed conversation about your care options.", fr: "Une analyse guidée de la peau qui favorise une discussion plus claire et mieux informée sur vos options de soin." },
  "rf-skin-treatment": { en: "Radiofrequency-focused care planned after assessing your skin, expectations and treatment suitability.", fr: "Un soin axé sur la radiofréquence planifié après l’évaluation de votre peau, de vos attentes et de la pertinence du traitement." },
  "rf-microneedling": { en: "A precision treatment combining microneedling with radiofrequency, planned only after a professional consultation.", fr: "Un soin de précision combinant microneedling et radiofréquence, planifié uniquement après une consultation professionnelle." },
  microneedling: { en: "A precision-focused skin service tailored after discussing suitability, expectations and aftercare.", fr: "Un soin de précision adapté après discussion de la pertinence, des attentes et des conseils après-traitement." },
  "microblading-eyebrow-shaping": { en: "A custom brow consultation and design shaped around your natural features and preferred finish.", fr: "Une consultation et une création sur mesure pensées selon vos traits naturels et le résultat souhaité." },
  "lip-blush-dark-lip-neutralization": { en: "A consultation-first lip service with colour goals, suitability and the healing process discussed carefully.", fr: "Un service des lèvres précédé d’une consultation attentive sur la couleur, la pertinence et la cicatrisation." },
  haircuts: { en: "A tailored cut designed around your texture, routine and the shape you want to wear every day.", fr: "Une coupe personnalisée selon votre texture, votre routine et la forme que vous souhaitez porter au quotidien." },
  "hair-colour-balayage": { en: "Personalized colour work planned around your starting point, maintenance preferences and desired finish.", fr: "Un travail de couleur personnalisé selon votre point de départ, l’entretien souhaité et le fini recherché." },
  "hair-botox-hydration": { en: "Conditioning and hydration options selected after assessing your hair’s texture, history and needs.", fr: "Des options de soin et d’hydratation choisies après l’évaluation de la texture, de l’historique et des besoins de vos cheveux." },
  "swedish-relaxation-massage": { en: "A calm massage experience with pressure, areas of focus and comfort discussed before the session.", fr: "Une expérience de massage apaisante dont la pression, les zones ciblées et le confort sont discutés avant la séance." },
  "lash-brow-lamination": { en: "A refined lash and brow service selected around your natural growth, features and preferred finish.", fr: "Un soin raffiné des cils et sourcils choisi selon leur croissance naturelle, vos traits et le fini souhaité." },
  "laser-skin-rejuvenation": { en: "Technology-led skin care with suitability, expectations and aftercare reviewed before treatment.", fr: "Un soin de la peau assisté par technologie, avec pertinence, attentes et conseils après-traitement examinés avant le soin." },
};

/** Previous public-page previews found on the deployed site; only these exact strings are upgraded. */
export const LEGACY_PUBLIC_SERVICE_PREVIEWS: Record<string, { en: string; fr: string }> = {
  "laser-hair-removal": {
    en: "Enjoy smoother skin with laser hair removal at Maryam C Beauté. The Candela GentleMax Pro Plus uses two wavelengths and is designed to treat all skin types, from light to dark. Each treatment is personalized based on your skin tone, hair type, and treatment area.",
    fr: "Profitez d’une peau plus douce grâce à l’épilation au laser chez Maryam C Beauté. Le Candela GentleMax Pro Plus utilise deux longueurs d’onde et est conçu pour traiter tous les phototypes, des peaux claires aux peaux foncées. Chaque traitement est personnalisé selon votre peau, votre type de poil et la zone à traiter.",
  },
  "vein-removal-treatment": {
    en: "Address the appearance of visible spider veins with a personalized laser treatment at Maryam C Beauté. Using the Candela GentleMax Pro Plus, we assess the treatment area and tailor the approach to your needs. A consultation helps determine whether the veins are suitable for laser treatment and what results you can expect.",
    fr: "Atténuez l’apparence des petites veines apparentes grâce à un traitement personnalisé chez Maryam C Beauté. Avec le Candela GentleMax Pro Plus, nous évaluons la zone à traiter et adaptons le traitement à vos besoins. Une consultation permet de déterminer si les veines peuvent être traitées au laser et quels résultats vous pouvez espérer.",
  },
  "ai-skin-analysis": {
    en: "Discover more about your skin with AI-powered skin analysis at Maryam C Beauté. The analysis provides a closer look at visible skin characteristics and concerns, helping us better understand your skin and personalize your skincare recommendations.",
    fr: "Découvrez votre peau plus en détail grâce à une analyse assistée par l’intelligence artificielle chez Maryam C Beauté. Cette analyse offre un aperçu des caractéristiques visibles de votre peau et de ses préoccupations, afin de mieux comprendre ses besoins et de personnaliser vos recommandations de soins.",
  },
  microneedling: {
    en: "microneedling uses fine needles to create controlled microchannels on the skin’s surface. This treatment helps improve the appearance of uneven skin texture and fine lines, leaving the skin looking smoother. Each treatment is tailored to your skin’s needs",
    fr: "Le microneedling utilise de fines aiguilles pour créer de petites microperforations contrôlées à la surface de la peau. Ce soin aide à améliorer l’apparence des irrégularités de texture et des ridules, pour une peau d’apparence plus lisse. Chaque traitement est adapté aux besoins de votre peau.",
  },
  "rf-microneedling": {
    en: "Improve the appearance of skin firmness, texture, fine lines, with RF microneedling at Maryam C Beauté. The Candela Matrix Pro combines microneedling with radiofrequency energy to stimulate collagen production. Its technology can deliver energy at up to three customizable skin depths in a single insertion, allowing treatment to be tailored to your skin concerns.",
    fr: "Améliorez l’apparence de la fermeté et de la texture de votre peau, ainsi que des ridules , grâce au microneedling par radiofréquence chez Maryam C Beauté. Le Candela Matrix Pro combine le microneedling à l’énergie de radiofréquence pour stimuler la production de collagène. Sa technologie peut délivrer de l’énergie à jusqu’à trois profondeurs cutanées personnalisables en une seule insertion, afin d’adapter le traitement aux préoccupations de votre peau.",
  },
  "rf-skin-treatment": {
    en: "Improve the appearance of fine lines, wrinkles, and uneven skin texture with a Sublative RF treatment at Maryam C Beauté. This fractional radiofrequency treatment is designed to refresh the skin’s surface and promote a smoother-looking complexion. Your treatment plan is personalized to your skin and goals.",
    fr: "Améliorez l’apparence des ridules, des rides et des irrégularités de texture grâce au traitement Sublative RF chez Maryam C Beauté. Ce traitement par radiofréquence fractionnée est conçu pour renouveler la surface de la peau et favoriser un teint d’apparence plus lisse. Votre plan de traitement est personnalisé selon votre peau et vos objectifs.",
  },
};

export function fullServiceDescription(slug: string, locale: "en" | "fr"): string | undefined {
  const ownerCopy = OWNER_SERVICE_COPY[slug];
  if (ownerCopy) return ownerCopy[locale];
  const copy = SERVICE_COPY[slug];
  if (!copy) return undefined;
  const paragraphs = locale === "fr" ? copy.detailFr.paragraphs : copy.detail.paragraphs;
  return [locale === "fr" ? copy.summaryFr : copy.summary, ...paragraphs].join("\n\n");
}

export function resolveServiceDescription(slug: string, description: string | null | undefined, locale: "en" | "fr"): ParsedServiceDescription | undefined {
  const previous = LEGACY_SERVICE_SUMMARIES[slug];
  const ownerCopy = OWNER_SERVICE_COPY[slug];
  const legacyFull = LEGACY_FULL_SERVICE_DESCRIPTIONS[slug]?.[locale];
  const legacyPublicPreview = LEGACY_PUBLIC_SERVICE_PREVIEWS[slug]?.[locale];
  const isOldContent = (previous && description === previous[locale]) || (legacyFull && description === legacyFull) || (legacyPublicPreview && description === legacyPublicPreview);
  const text = !description?.trim() || isOldContent ? ownerCopy?.[locale] ?? fullServiceDescription(slug, locale) : description;
  if (!text) return undefined;
  const parsed = parseServiceDescription(slug, text, locale);
  if (parsed?.detail && "customSections" in parsed.detail && parsed.detail.customSections) return parsed;
  const copy = SERVICE_COPY[slug];
  if (copy && (text === fullServiceDescription(slug, locale) || isOldContent)) {
    return { summary: locale === "fr" ? copy.summaryFr : copy.summary, detail: locale === "fr" ? copy.detailFr : copy.detail };
  }
  return parsed;
}
