"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

import Container from "@/components/Container";
import GradientText from "@/components/GradientText";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Games", href: "/games" },
  { label: "Download", href: "/#download" },
  { label: "Contribute", href: "/contribute" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isLinkActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/#download") return false;
    return pathname?.startsWith(href);
  };

  return (
    <motion.header
      className="sticky top-0 z-30"
      animate={{
        backgroundColor: isScrolled ? "rgba(10, 12, 18, 0.6)" : "rgba(0,0,0,0)",
        borderColor: isScrolled ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0)",
        boxShadow: isScrolled
          ? "0 16px 40px rgba(5, 6, 10, 0.55)"
          : "0 0 0 rgba(0,0,0,0)",
        backdropFilter: isScrolled ? "blur(18px)" : "blur(0px)",
      }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      style={{ borderBottomWidth: 1, borderStyle: "solid" }}
    >
      <Container>
        <div className="flex h-16 items-center justify-between">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 text-lg font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            <GradientText className="text-xl font-semibold tracking-tight">
              FunDeck
            </GradientText>
            <span
              aria-hidden="true"
              className="relative inline-flex h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(56,189,248,0.8)] animate-[pulse_2.4s_ease-in-out_infinite]"
            />
          </Link>

          <nav className="hidden items-center gap-6 text-sm md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`relative inline-flex items-center gap-2 text-white/80 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                  isLinkActive(link.href) ? "text-white" : ""
                }`}
              >
                <span>{link.label}</span>
                <motion.span
                  className="absolute -bottom-2 left-0 h-[2px] w-full origin-left rounded-full bg-gradient-to-r from-cyan-400 via-purple-400 to-emerald-300"
                  initial={{ scaleX: isLinkActive(link.href) ? 1 : 0 }}
                  animate={{ scaleX: isLinkActive(link.href) ? 1 : 0 }}
                  whileHover={{ scaleX: 1 }}
                  transition={{ type: "spring", stiffness: 160, damping: 18 }}
                />
              </Link>
            ))}
          </nav>

          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={isMenuOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 md:hidden"
            onClick={() => setIsMenuOpen((prev) => !prev)}
          >
            <span className="relative h-3 w-4">
              <span
                className={`absolute left-0 top-0 h-[2px] w-full rounded-full bg-white transition ${
                  isMenuOpen ? "translate-y-[6px] rotate-45" : ""
                }`}
              />
              <span
                className={`absolute left-0 top-[6px] h-[2px] w-full rounded-full bg-white transition ${
                  isMenuOpen ? "opacity-0" : ""
                }`}
              />
              <span
                className={`absolute left-0 top-[12px] h-[2px] w-full rounded-full bg-white transition ${
                  isMenuOpen ? "-translate-y-[6px] -rotate-45" : ""
                }`}
              />
            </span>
          </button>
        </div>
      </Container>

      {isMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="border-t border-white/10 bg-white/[0.04] backdrop-blur-xl md:hidden"
        >
          <Container>
            <div className="flex flex-col gap-4 py-6 text-sm">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`text-white/80 hover:text-white ${
                    isLinkActive(link.href) ? "text-white" : ""
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </Container>
        </motion.div>
      )}
    </motion.header>
  );
}
