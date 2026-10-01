import { redirect } from "next/navigation";

/**
 * The design preview was the first iteration of the redesign. Keep its URL as a
 * compatibility alias, but ensure visitors always see the maintained homepage.
 */
export default async function PreviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}`);
}
