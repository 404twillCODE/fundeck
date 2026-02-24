"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import Container from "@/components/Container";
import GradientText from "@/components/GradientText";

const navLinks = [
  { label: "Games", href: "/" },
  { label: "Leaderboards", href: "/leaderboards" },
  { label: "Account", href: "/account" },
] as Array<{ label: string; href: string; disabled?: boolean }>;

export default function Navbar() {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hideOnScroll, setHideOnScroll] = useState(false);
  const motionDuration = prefersReducedMotion ? 0 : 0.35;

  useEffect(() => {
    const handleResize = () => {
      const isSmallWidth = window.matchMedia("(max-width: 1024px)").matches;
      const isShortHeight = window.matchMedia("(max-height: 600px)").matches;
      setIsMobile(isSmallWidth || isShortHeight);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      const currentY = window.scrollY;
      setIsScrolled(currentY > 24);
      if (isMobile) {
        const scrollingDown = currentY > lastScrollY;
        setHideOnScroll(scrollingDown && currentY > 80);
      } else {
        setHideOnScroll(false);
      }
      lastScrollY = currentY;
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isMobile]);

  const underlineTransition = useMemo(
    () =>
      prefersReducedMotion
        ? { duration: 0 }
        : { type: "spring" as const, stiffness: 160, damping: 18 },
    [prefersReducedMotion],
  );

  const isLinkActive = (href: string) => {
    if (href === "#") return false;
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  };

  return (
    <motion.header
      className="sticky top-0 z-30"
      animate={{
        backgroundColor: isScrolled ? "rgba(10, 12, 18, 0.6)" : "rgba(0,0,0,0)",
        borderColor: isScrolled
          ? "rgba(255,255,255,0.08)"
          : "rgba(255,255,255,0)",
        boxShadow: isScrolled
          ? "0 16px 40px rgba(5, 6, 10, 0.55)"
          : "0 0 0 rgba(0,0,0,0)",
        backdropFilter: isScrolled ? "blur(18px)" : "blur(0px)",
        y: hideOnScroll ? -96 : 0,
      }}
      transition={{ duration: motionDuration, ease: "easeOut" }}
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
              className={`relative inline-flex h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(56,189,248,0.8)] ${
                prefersReducedMotion ? "" : "animate-[pulse_2.4s_ease-in-out_infinite]"
              }`}
            >
              <span className="absolute inset-0 rounded-full bg-cyan-300/70 blur-[6px]" />
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm md:flex">
            {navLinks.map((link) => {
              const isActive = isLinkActive(link.href);
              if (link.disabled) {
                return (
                  <span
                    key={link.label}
                    aria-disabled="true"
                    className="relative inline-flex items-center gap-2 text-white/40"
                  >
                    {link.label}
                    <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.3em] text-white/50">
                      Soon
                    </span>
                  </span>
                );
              }
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`group relative inline-flex items-center gap-2 text-white/80 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                    isActive
                      ? "text-white"
                      : "hover:text-white hover:drop-shadow-[0_0_12px_rgba(56,189,248,0.6)]"
                  }`}
                >
                  <span>{link.label}</span>
                  <motion.span
                    className="absolute -bottom-2 left-0 h-[2px] w-full origin-left rounded-full bg-gradient-to-r from-cyan-400 via-purple-400 to-emerald-300"
                    initial={{ scaleX: isActive ? 1 : 0 }}
                    animate={{ scaleX: isActive ? 1 : 0 }}
                    whileHover={{ scaleX: 1 }}
                    transition={underlineTransition}
                  />
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={isMenuOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black md:hidden"
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

      <AnimatePresence>
        {isMenuOpen ? (
          <motion.div
            initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -8 }}
            transition={{
              type: prefersReducedMotion ? "tween" : "spring",
              stiffness: 180,
              damping: 20,
              duration: prefersReducedMotion ? 0 : undefined,
            }}
            className="border-t border-white/10 bg-white/[0.04] backdrop-blur-xl md:hidden"
          >
            <Container>
              <div className="flex flex-col gap-4 py-6 text-sm">
                {navLinks.map((link) => {
                  const isActive = isLinkActive(link.href);
                  if (link.disabled) {
                    return (
                      <span
                        key={link.label}
                        aria-disabled="true"
                        className="flex items-center justify-between text-white/40"
                      >
                        <span>{link.label}</span>
                        <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.3em] text-white/50">
                          Soon
                        </span>
                      </span>
                    );
                  }
                  return (
                    <Link
                      key={link.label}
                      href={link.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={`group relative inline-flex items-center justify-between text-white/80 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                        isActive
                          ? "text-white"
                          : "hover:text-white hover:drop-shadow-[0_0_12px_rgba(56,189,248,0.6)]"
                      }`}
                    >
                      <span>{link.label}</span>
                      <motion.span
                        className="absolute -bottom-2 left-0 h-[2px] w-full origin-left rounded-full bg-gradient-to-r from-cyan-400 via-purple-400 to-emerald-300"
                        initial={{ scaleX: isActive ? 1 : 0 }}
                        animate={{ scaleX: isActive ? 1 : 0 }}
                        whileHover={{ scaleX: 1 }}
                        transition={underlineTransition}
                      />
                    </Link>
                  );
                })}
              </div>
            </Container>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.header>
  );
}
