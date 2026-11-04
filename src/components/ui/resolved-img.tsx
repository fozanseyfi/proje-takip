"use client";

import { useResolvedPhotoUrls } from "@/lib/data/photo-store";

/** IndexedDB referanslı ("idb:...") veya düz url'li fotoğrafı gösterir. */
export function ResolvedImg({
  url,
  alt,
  className,
}: {
  url: string;
  alt: string;
  className?: string;
}) {
  const [src] = useResolvedPhotoUrls([url]);
  if (!src) return <div className={className} aria-label={alt} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} />;
}
