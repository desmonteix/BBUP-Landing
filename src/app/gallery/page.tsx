import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Container } from "@/components/ui/Container";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { GalleryHero } from "@/components/gallery/GalleryHero";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Candid moments from Best Buddy UP! events — trips, meetups, and everything between.",
};

type Orientation = "landscape" | "portrait";

// Real event photos. Orientation read directly from each file's actual
// pixel dimensions (accounting for EXIF rotation) rather than guessed, so
// the grid sizes each tile correctly.
const ORIENTATIONS: Orientation[] = [
  "portrait", // 01
  "landscape", // 02
  "portrait", // 03
  "portrait", // 04
  "portrait", // 05
  "landscape", // 06
  "landscape", // 07
  "landscape", // 08
  "portrait", // 09
  "landscape", // 10
  "portrait", // 11
  "portrait", // 12
  "landscape", // 13
  "landscape", // 14
  "portrait", // 15
];

const PHOTOS = ORIENTATIONS.map((orientation, i) => {
  const n = i + 1;
  return {
    src: `/images/gallery/photo-${String(n).padStart(2, "0")}.jpg`,
    alt: `Best Buddy UP! event photo ${n}`,
    orientation,
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
            description="More photos land here after every event — this is what showing up looks like."
          />
          <div className="mt-12">
            <GalleryGrid photos={PHOTOS} />
          </div>
        </Container>
      </section>
    </>
  );
}
