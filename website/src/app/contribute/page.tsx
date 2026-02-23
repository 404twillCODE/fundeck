"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import Container from "@/components/Container";
import GradientText from "@/components/GradientText";
import NeonCard from "@/components/NeonCard";

export default function Contribute() {
  return (
    <main className="flex-1">
      <section className="py-20 sm:py-28">
        <Container>
          <div className="max-w-3xl space-y-6">
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              <GradientText>Contribute</GradientText>
            </h1>
            <p className="text-lg text-white/60">
              FunDeck is open source. Add new games, fix bugs, or improve the
              docs.
            </p>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 140, damping: 16 }}
            className="mt-12"
          >
            <NeonCard className="p-8">
              <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/50">
                Get started
              </h2>
              <p className="mt-4 text-white/80">
                (Link to CONTRIBUTING.md or repo + contribution guidelines.)
              </p>
              <p className="mt-2 text-sm text-white/50">
                The repo is split into <code className="rounded bg-white/10 px-1.5 py-0.5">website</code>,{" "}
                <code className="rounded bg-white/10 px-1.5 py-0.5">desktop</code>,{" "}
                <code className="rounded bg-white/10 px-1.5 py-0.5">server</code>, and{" "}
                <code className="rounded bg-white/10 px-1.5 py-0.5">join-website</code>. Run from each folder with{" "}
                <code className="rounded bg-white/10 px-1.5 py-0.5">npm run dev</code>.
              </p>
              <Link
                href="/"
                className="mt-6 inline-flex rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                Back to home
              </Link>
            </NeonCard>
          </motion.div>
        </Container>
      </section>
    </main>
  );
}
