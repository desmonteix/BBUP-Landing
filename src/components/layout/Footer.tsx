import Link from "next/link";
import Image from "next/image";
import { Instagram, MessageCircle, Music2 } from "lucide-react";
import { NewsletterForm } from "@/components/home/NewsletterForm";

export function Footer() {
  return (
    <footer className="border-t border-border bg-paper-sunk">
      <div className="mx-auto max-w-content px-5 py-14 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/LOGO%20BBUP%20COLOR.png"
                alt="Best Buddy UP!"
                width={40}
                height={40}
                className="rounded-full"
              />
              <span className="font-display text-lg font-semibold text-ink">
                Best Buddy UP!
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink/65">
              Connecting exchange students with Peruvian buddies — one event,
              one friendship at a time.
            </p>
            <div className="mt-5 flex gap-3">
              <SocialLink href="https://instagram.com" label="Instagram">
                <Instagram size={18} />
              </SocialLink>
              <SocialLink href="https://tiktok.com" label="TikTok">
                <Music2 size={18} />
              </SocialLink>
              <SocialLink href="https://wa.me/51999999999" label="WhatsApp">
                <MessageCircle size={18} />
              </SocialLink>
            </div>
          </div>

          <div>
            <h3 className="font-body text-xs font-semibold uppercase tracking-wider text-ink/50">
              Explore
            </h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <Link href="/about" className="text-ink/70 hover:text-pink">
                  About us
                </Link>
              </li>
              <li>
                <Link href="/events" className="text-ink/70 hover:text-pink">
                  Events
                </Link>
              </li>
              <li>
                <Link href="/gallery" className="text-ink/70 hover:text-pink">
                  Gallery
                </Link>
              </li>
              <li>
                <Link href="/signup" className="text-ink/70 hover:text-pink">
                  Create an account
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-body text-xs font-semibold uppercase tracking-wider text-ink/50">
              Stay in the loop
            </h3>
            <p className="mt-4 text-sm text-ink/65">
              One email a month, next events only. No spam.
            </p>
            <NewsletterForm className="mt-4" compact />
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-border pt-6 text-xs text-ink/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Best Buddy UP!. Lima, Peru.</p>
          <p>hello@bestbuddyup.org (placeholder)</p>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white text-ink/60 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:text-pink hover:shadow-md"
    >
      {children}
    </a>
  );
}
