"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/about", label: "About" },
  { href: "/events", label: "Events" },
  { href: "/gallery", label: "Gallery" },
];

export function Navbar({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-content items-center justify-between px-5 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 font-display text-lg font-semibold text-ink"
          onClick={() => setOpen(false)}
        >
          <Image
            src="/LOGO%20BBUP%20COLOR.png"
            alt="Best Buddy UP!"
            width={36}
            height={36}
            className="rounded-full"
            priority
          />
          <span className="hidden sm:inline">Best Buddy UP!</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "font-body text-sm font-semibold text-ink/70 transition-colors duration-200 hover:text-pink",
                pathname === link.href && "text-pink"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {isLoggedIn ? (
            <LinkButton href="/account" variant="secondary" size="md">
              My account
            </LinkButton>
          ) : (
            <>
              <Link
                href="/login"
                className="font-body text-sm font-semibold text-ink/70 hover:text-pink"
              >
                Log in
              </Link>
              <LinkButton href="/signup" variant="primary" size="md">
                Sign up
              </LinkButton>
            </>
          )}
        </div>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-ink hover:bg-pink-tint md:hidden"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-paper px-5 pb-6 pt-2 md:hidden">
          <nav className="flex flex-col gap-1">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-3 font-body text-base font-semibold text-ink/80 hover:bg-pink-tint hover:text-pink"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-3 flex flex-col gap-3">
              {isLoggedIn ? (
                <LinkButton href="/account" variant="secondary">
                  My account
                </LinkButton>
              ) : (
                <>
                  <LinkButton href="/login" variant="secondary">
                    Log in
                  </LinkButton>
                  <LinkButton href="/signup" variant="primary">
                    Sign up
                  </LinkButton>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
