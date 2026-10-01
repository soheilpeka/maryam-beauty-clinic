/** Owner-supplied salon photography. No before/after relationship is implied. */
export interface GalleryItem { slug: string; title: string; titleFr?: string; caption: string; captionFr?: string; image: string; tag: "Hair" | "Treatment"; span?: boolean; }
export const GALLERY_INTRO = "Colour, texture and details from the salon.";
export const GALLERY: GalleryItem[] = [
  { slug: "example-layered-look", title: "Soft waves", titleFr: "Ondulations souples", caption: "Soft waves", captionFr: "Ondulations souples", image: "/media/salon/img_5888.webp", tag: "Hair" },
  { slug: "example-bob-look", title: "Dimensional colour", titleFr: "Couleur tout en nuances", caption: "Dimensional colour", captionFr: "Couleur tout en nuances", image: "/media/salon/img_7488.webp", tag: "Hair" },
  { slug: "example-seasonal-look", title: "Cool-toned finish", titleFr: "Nuances froides", caption: "Cool-toned finish", captionFr: "Nuances froides", image: "/media/salon/img_8171.webp", tag: "Hair" },
  { slug: "example-rf-device", title: "Care at the salon", titleFr: "Un soin au salon", caption: "Care at the salon", captionFr: "Un soin au salon", image: "/media/salon/caver1.webp", tag: "Treatment" },
  { slug: "salon-6218", title: "Face-framing layers", titleFr: "Dégradé autour du visage", caption: "Face-framing layers", captionFr: "Dégradé autour du visage", image: "/media/salon/img_6218.webp", tag: "Hair" },
  { slug: "salon-6573", title: "Movement and texture", titleFr: "Mouvement et texture", caption: "Movement and texture", captionFr: "Mouvement et texture", image: "/media/salon/img_6573.webp", tag: "Hair" },
  { slug: "salon-7498", title: "A personal finish", titleFr: "Un fini personnalisé", caption: "A personal finish", captionFr: "Un fini personnalisé", image: "/media/salon/img_7498.webp", tag: "Hair" },
  { slug: "salon-8204", title: "Colour in the light", titleFr: "La couleur à la lumière", caption: "Colour in the light", captionFr: "La couleur à la lumière", image: "/media/salon/img_8204.webp", tag: "Hair" },
  { slug: "salon-8220", title: "Long, flowing waves", titleFr: "Longues ondulations", caption: "Long, flowing waves", captionFr: "Longues ondulations", image: "/media/salon/img_8220.webp", tag: "Hair" },
];
export const GALLERY_TAGS = ["All", "Hair", "Treatment"] as const;
