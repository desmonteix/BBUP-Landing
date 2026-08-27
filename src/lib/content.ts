/**
 * Static placeholder content (team, values, testimonials). Not part of the
 * Supabase data model in spec §4 — the spec only defines DB tables for
 * profiles/events/registrations/admins/newsletter_subscribers, so this is
 * intentionally kept as editable static data rather than invented tables.
 * Swap for real copy/photos later; shapes match src/lib/types.ts.
 */
import type { TeamMember, Testimonial } from "@/lib/types";

export const TEAM: TeamMember[] = [
  { id: "1", name: "Camila Rios", role: "Events Lead", photo: "/images/team/member-1.svg", committee: "Events" },
  { id: "2", name: "Diego Alvarado", role: "Treasurer", photo: "/images/team/member-2.svg", committee: "Finance" },
  { id: "3", name: "Valeria Chumpitaz", role: "Compliance Officer", photo: "/images/team/member-3.svg", committee: "Legal" },
  { id: "4", name: "Mateo Salinas", role: "Merch Lead", photo: "/images/team/member-4.svg", committee: "Merch" },
  { id: "5", name: "Sofia Bravo", role: "Culture Coordinator", photo: "/images/team/member-5.svg", committee: "S&C" },
  { id: "6", name: "Andres Quiroz", role: "Social Media Lead", photo: "/images/team/member-6.svg", committee: "Social Media" },
  { id: "7", name: "Bruno Castillo", role: "Sports Coordinator", photo: "/images/team/member-7.svg", committee: "Sports" },
  { id: "8", name: "Lucia Ferrand", role: "Tandem Lead", photo: "/images/team/member-8.svg", committee: "Tandem" },
  { id: "9", name: "Renata Solis", role: "Trips Coordinator", photo: "/images/team/member-9.svg", committee: "Trips" },
  { id: "10", name: "Ignacio Vera", role: "President", photo: "/images/team/member-10.svg", committee: "Events" },
];

export const VALUES = [
  {
    title: "Warm, not staged",
    description:
      "We introduce people the way you'd introduce a friend — no icebreaker gimmicks, just real hangouts.",
  },
  {
    title: "Peru, first-hand",
    description:
      "From street food to Sunday futbol, we hand exchange students the version of Peru locals actually live.",
  },
  {
    title: "Every buddy shows up",
    description:
      "Small groups, consistent faces. Friendships need repetition, not a one-off welcome party.",
  },
  {
    title: "Open to everyone",
    description:
      "Any nationality, any university, any budget — there's an event here for you.",
  },
];

export const TESTIMONIALS_SHORT: Testimonial[] = [
  {
    id: "1",
    quote:
      "I landed in Lima knowing nobody. Three weeks later I had a Peruvian family away from home.",
    name: "Lena Hoffmann",
    role: "Exchange student, Germany",
    avatar: "/images/testimonials/avatar-1.svg",
  },
  {
    id: "2",
    quote:
      "Being a buddy taught me more about my own country than four years of university did.",
    name: "Rodrigo Peña",
    role: "Buddy, Lima",
    avatar: "/images/testimonials/avatar-2.svg",
  },
  {
    id: "3",
    quote: "The Cusco trip alone was worth joining for. But the friendships were the real prize.",
    name: "Amara Okafor",
    role: "Exchange student, Nigeria",
    avatar: "/images/testimonials/avatar-3.svg",
  },
];

export const TESTIMONIALS_FULL: Testimonial[] = [
  ...TESTIMONIALS_SHORT,
  {
    id: "4",
    quote:
      "Every event felt like hanging out with friends, not attending a program. That's rare.",
    name: "Julien Marchand",
    role: "Exchange student, France",
    avatar: "/images/testimonials/avatar-4.svg",
  },
  {
    id: "5",
    quote: "I've made lifelong friends from four continents without leaving Lima.",
    name: "Ana Ferreira",
    role: "Buddy, Lima",
    avatar: "/images/testimonials/avatar-5.svg",
  },
];

export const STATS = [
  { label: "Exchange students welcomed", value: 1200, suffix: "+" },
  { label: "Events run since 2019", value: 120, suffix: "" },
  { label: "Countries represented", value: 30, suffix: "" },
  { label: "Peruvian buddies active", value: 60, suffix: "+" },
];
