/** Temporary examples only. Replace with owner-approved client work before launch. */
export interface GalleryItem {
  slug: string;
  title: string;
  caption: string;
  image: string;
  tag: "Hair" | "Treatment";
  span?: boolean;
}

export const GALLERY_INTRO =
  "This is a temporary visual direction using example images. Final client work, captions and permissions are still required before launch.";

export const GALLERY: GalleryItem[] = [
  {
    slug: "example-layered-look",
    title: "Layered hair inspiration",
    caption: "Temporary example image — not presented as salon client work.",
    image: "/example-pics/hair-look-1.png",
    tag: "Hair",
  },
  {
    slug: "example-bob-look",
    title: "Modern bob inspiration",
    caption: "Temporary example image — not presented as salon client work.",
    image: "/example-pics/hair-look-2.jpeg",
    tag: "Hair",
  },
  {
    slug: "example-seasonal-look",
    title: "Seasonal hair inspiration",
    caption: "Temporary example image — not presented as salon client work.",
    image: "/example-pics/hair-look-3.jpeg",
    tag: "Hair",
    span: true,
  },
  {
    slug: "example-rf-device",
    title: "RF treatment technology",
    caption: "Temporary treatment image awaiting final owner-approved photography.",
    image: "/example-pics/micromachin.jpeg",
    tag: "Treatment",
  },
];

export const GALLERY_TAGS = ["All", "Hair", "Treatment"] as const;
