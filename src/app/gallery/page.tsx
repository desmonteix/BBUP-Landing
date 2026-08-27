import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Container } from "@/components/ui/Container";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { GalleryHero } from "@/components/gallery/GalleryHero";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Candid moments from Best Buddy UP! events — trips, meetups, and everything between.",
};

const PHOTOS = Array.from({ length: 16 }, (_, i) => {
  const n = i + 1;
  const landscape = n % 3 !== 0;
  return {
    src: `/images/gallery/photo-${String(n).padStart(2, "0")}.svg`,
    alt: `Best Buddy UP! event photo ${n}`,
    orientation: (landscape ? "landscape" : "portrait") as "landscape" | "portrait",
  };
});

export default function GalleryPage() {
  return (
    <>
      <GalleryHero />
      <section className="py-16 sm:py-20">
        <Container>
          <SectionHeading
            eyebrow="The full album"
            title="Every trip, meetup, and everything in between."
            description="Real event photos will replace these placeholders as they come in."
          />
          <div className="mt-12">
            <GalleryGrid photos={PHOTOS} />
          </div>
        </Container>
      </section>
    </>
  );
}
