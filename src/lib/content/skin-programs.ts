export type PackagePreview = {
  slug: string;
  name: string;
  strapline: string;
  description: string;
  stats: string[];
  included: string[];
  idealFor: string[];
  price: string;
  regular: string;
  saving: string;
  payment?: string;
  schedule?: string[];
};

export const SKIN_PROGRAMS: PackagePreview[] = [
  {
    slug: "discovery",
    name: "Discovery Package",
    strapline: "The perfect intro to your best skin journey",
    description: "Discover, experience and transform in one personalized session.",
    stats: ["3 premium experiences", "1 session", "New clients only"],
    included: ["Advanced AI Skin Analysis", "Hydra Facial Experience", "Candela Matrix RF Microneedling Consultation"],
    idealFor: ["Personalized skin evaluation", "A clear treatment roadmap", "A first clinic experience"],
    price: "$99",
    regular: "$399",
    saving: "Introductory offer",
  },
  {
    slug: "glow-renewal",
    name: "Glow Renewal Package",
    strapline: "Your skin’s essential glow program",
    description: "A signature HydraFacial maintenance program for healthy, hydrated and radiant-looking skin.",
    stats: ["6 treatments", "90 min each", "12-month program"],
    included: ["6 Signature HydraFacial treatments", "AI Skin Analysis", "Personalized Skin Evaluation", "Customized Treatment Protocol", "Before & After Progress Tracking"],
    idealFor: ["Dehydrated skin", "Dull complexion", "Enlarged pores", "Uneven skin tone", "Preventive skincare", "Maintaining healthy skin"],
    price: "$1,194",
    regular: "$2,094",
    saving: "Save $900",
    payment: "$99/month · 12 monthly payments · 0% interest",
    schedule: ["One HydraFacial treatment every 2 months", "Total program duration: 12 months"],
  },
  {
    slug: "essential",
    name: "Essential Package",
    strapline: "Your first step to long-term skin rejuvenation",
    description: "A professionally designed program combining Candela Matrix RF Microneedling and Hydra Facial treatments.",
    stats: ["6 treatments", "90 min each", "2 treatment phases"],
    included: ["3 Candela Matrix RF Microneedling treatments", "3 Signature HydraFacial treatments", "AI Skin Analysis", "Personalized Treatment Plan", "Progress Monitoring"],
    idealFor: ["Early signs of aging", "Fine lines", "Dehydrated skin", "Uneven skin tone", "Prevention and maintenance", "Healthy skin aging"],
    price: "$1,722",
    regular: "$2,397",
    saving: "Save $675",
    payment: "$246/month · 7 monthly payments · 0% interest",
    schedule: ["Phase 1: Matrix RF Microneedling in months 1–3", "6-week healing period", "Phase 2: HydraFacial treatments approximately every 6 weeks"],
  },
  {
    slug: "platinum",
    name: "Platinum Package",
    strapline: "The ultimate skin transformation program",
    description: "A comprehensive combination of Candela Matrix RF Microneedling, RF treatments and Hydra Facial.",
    stats: ["10 premium treatments", "2 treatment phases", "Personalized journey"],
    included: ["3 Candela Matrix RF Microneedling treatments", "3 RF treatments", "4 Signature HydraFacial treatments", "AI Skin Analysis", "Personalized Treatment Plan", "Progress Monitoring & Follow-Up", "Premium Aftercare Guidance"],
    idealFor: ["Fine lines and wrinkles", "Loss of firmness and elasticity", "Uneven skin tone and texture", "Enlarged pores", "Dull and dehydrated skin", "Overall skin rejuvenation"],
    price: "$2,593",
    regular: "$3,594",
    saving: "Save $1,001",
    payment: "$216/month · 12 monthly payments · 0% interest",
    schedule: ["Matrix + RF treatments during the rebuild and renew phase", "HydraFacial treatments during the hydrate and maintain phase", "Treatment journey shown by month on the original artwork"],
  },
  {
    slug: "diamond",
    name: "Diamond Package",
    strapline: "The ultimate skin transformation journey",
    description: "Our most comprehensive program combining Matrix RF Microneedling, RF treatments and HydraFacial.",
    stats: ["15 premium treatments", "2 treatment phases", "Long-term support"],
    included: ["5 Candela Matrix RF Microneedling treatments", "5 RF treatments", "5 Signature HydraFacial treatments", "AI Skin Analysis", "Personalized Treatment Plan", "Progress Monitoring & Follow-Up", "Premium Aftercare Guidance"],
    idealFor: ["Fine lines and wrinkles", "Loss of firmness and elasticity", "Uneven skin tone and texture", "Enlarged pores", "Dull and dehydrated skin", "Long-term skin rejuvenation"],
    price: "$3,995",
    regular: "$5,995",
    saving: "Save $2,000",
    payment: "$332/month · 12 monthly payments · 0% interest",
    schedule: ["Phase 1: 5 Matrix + RF sessions during rebuild and renew", "Phase 2: 5 HydraFacial sessions during hydrate and maintain", "Treatment journey shown by month on the original artwork"],
  },
];


