/** Normalized viewports of supplied boards. No retouching or synthetic alignment. */
export type PhotoViewport = { x: number; y: number; width: number; height: number };
export type ComparisonExample = {
  id: string; image: string; family: "laser" | "rf"; title: string; titleFr: string;
  before: PhotoViewport; after: PhotoViewport; boardRatio: number;
};
function example(index: number, title: string, titleFr: string, family: ComparisonExample["family"], layout: "standard" | "pro" | "square" | "face" | "underarm" = "standard"): ComparisonExample {
  const boardWidth = layout === "underarm" ? 1780 : 2048;
  const boardHeight = layout === "pro" ? 1168 : layout === "underarm" ? 1376 : 1080;
  let left = [0, 127, 1014, 720];
  let right = [1034, 127, 1014, 720];
  if (layout === "pro") { left = [0, 143, 1014, 778]; right = [1034, 143, 1014, 778]; }
  if (layout === "square") { left = [147, 127, 721, 720]; right = [1180, 127, 721, 720]; }
  if (layout === "face") { left = [16, 127, 983, 720]; right = [1034, 127, 983, 720]; }
  if (layout === "underarm") { left = [191, 410, 675, 506]; right = [914, 410, 675, 506]; }
  const crop = (rectangle: number[]): PhotoViewport => ({ x: rectangle[0] / boardWidth, y: rectangle[1] / boardHeight, width: rectangle[2] / boardWidth, height: rectangle[3] / boardHeight });
  return { id: `comparison-${String(index).padStart(2, "0")}`, image: `/media/comparisons/comparison-${String(index).padStart(2, "0")}.webp`, family, title, titleFr, before: crop(left), after: crop(right), boardRatio: boardWidth / boardHeight };
}
export const COMPARISONS: ComparisonExample[] = [
  example(1, "Neck · hair", "Nuque · pilosité", "laser"),
  example(2, "Chin · hair", "Menton · pilosité", "laser"),
  example(3, "Cheek · hair", "Joue · pilosité", "laser", "pro"),
  example(4, "Upper lip · hair", "Lèvre supérieure · pilosité", "laser", "pro"),
  example(5, "Leg · visible vessels", "Jambe · vaisseaux visibles", "laser", "pro"),
  example(6, "Back · hair", "Dos · pilosité", "laser", "pro"),
  example(7, "Neck · hair", "Cou · pilosité", "laser", "pro"),
  example(8, "Nose · visible vessels", "Nez · vaisseaux visibles", "laser", "pro"),
  example(9, "Nose · visible vessels", "Nez · vaisseaux visibles", "laser", "pro"),
  example(10, "Face · skin texture", "Visage · texture de la peau", "rf", "square"),
  example(11, "Abdomen · skin texture", "Abdomen · texture de la peau", "rf"),
  example(12, "Face · skin appearance", "Visage · aspect de la peau", "rf", "face"),
  example(13, "Cheek · skin texture", "Joue · texture de la peau", "rf"),
  example(14, "Profile · skin appearance", "Profil · aspect de la peau", "rf"),
  example(15, "Face · skin texture", "Visage · texture de la peau", "rf"),
  example(16, "Cheek · skin texture", "Joue · texture de la peau", "rf"),
  example(17, "Face · skin appearance", "Visage · aspect de la peau", "rf"),
  example(18, "Underarm · hair", "Aisselle · pilosité", "laser", "underarm"),
];
export function photoViewportStyle(crop: PhotoViewport) {
  return { width: `${100 / crop.width}%`, height: `${100 / crop.height}%`, left: `${-100 * crop.x / crop.width}%`, top: `${-100 * crop.y / crop.height}%` };
}
