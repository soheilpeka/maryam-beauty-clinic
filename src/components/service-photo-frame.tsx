import { photoViewportStyle, type PhotoViewport } from "@/lib/content/comparisons";
import { servicePhotoComparisons } from "@/lib/content/service-comparisons";
import styles from "./service-photo-frame.module.css";

const layouts: Record<string, { ratio: number; crop?: PhotoViewport; background?: string }> = {
  "ai-skin-analysis/01": { ratio: 1175 / 1003 },
  "ai-skin-analysis/04": { ratio: 1200 / 1500 },
  "ai-skin-analysis/wrinkle-map": { ratio: 1051 / 1073, crop: { x: 0, y: 0, width: 1, height: 1073 / 1088 } },
  "ai-skin-analysis/02": { ratio: 1117 / 1029 },
  "ai-skin-analysis/03": { ratio: 1203 / 1068, crop: { x: 21 / 1224, y: 0, width: 1203 / 1224, height: 1 } },
  "deep-cleansing-facials/01": { ratio: 1320 / 892 },
  "hair-colour-balayage/01": { ratio: .75 },
  "hydrafacial/01": { ratio: 1320 / 1158 },
  "laser-hair-removal/01": { ratio: 870 / 1600, background: "#fefefe", crop: { x: 190 / 1106, y: 0, width: 870 / 1106, height: 1 } },
  "laser-skin-rejuvenation/01": { ratio: 1320 / 714 },
  "lash-brow-lamination/02": { ratio: 1 },
  "lip-blush-dark-lip-neutralization/01": { ratio: .75 },
  "microneedling/01": { ratio: .8 },
  "pigmented-lesions-laser-treatment/cover": { ratio: 1024 / 1536 },
  "rf-microneedling/featured": { ratio: 1157 / 1600 },
  "rf-microneedling/01": { ratio: 600 / 338 },
  "rf-microneedling/02": { ratio: 1148 / 1600, background: "#646b71" },
  "rf-skin-treatment/01": { ratio: 1320 / 1897, background: "#646b71" },
  "rf-skin-treatment/02": { ratio: 1258 / 1372, background: "#030303", crop: { x: 0, y: 405 / 2048, width: 1, height: 1372 / 2048 } },
  "swedish-relaxation-massage/01": { ratio: 1320 / 705 },
};

export function ServicePhotoFrame({ src, alt, variant = "gallery" }: {
  src: string; alt: string; variant?: "hero" | "catalog" | "gallery";
}) {
  const asset = /^\/media\/services\/([^/]+)\/([^/]+)\.webp$/.exec(src);
  const layout = asset ? layouts[`${asset[1]}/${asset[2]}`] : undefined;
  const pair = asset ? servicePhotoComparisons(asset[1], new Set([src]))[0] : undefined;
  const crop = pair?.afterCrop ?? layout?.crop;
  const ratio = pair?.aspectRatio ?? layout?.ratio ?? 4 / 3;
  const catalog = variant === "catalog";
  const frameRatio = catalog ? .8 : ratio;
  const mediaWidth = catalog && (crop || layout?.background) ? `${(layout?.background ? Math.min(1, ratio / frameRatio) : Math.max(1, ratio / frameRatio)) * 100}%` : "100%";

  return <div
    className={`${styles.frame} ${styles[variant]}`}
    style={{ aspectRatio: frameRatio, maxWidth: variant === "hero" ? `${34 * ratio}rem` : undefined, backgroundColor: layout?.background }}
  >
    <div className={styles.media} style={catalog && !crop && !layout?.background ? undefined : { aspectRatio: ratio, width: mediaWidth }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading={variant === "hero" ? "eager" : "lazy"} decoding="async"
        className={crop ? styles.cropped : styles.photo} style={crop ? photoViewportStyle(crop) : undefined} />
    </div>
  </div>;
}
