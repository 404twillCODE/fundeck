"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import Container from "@/components/Container";
import GradientText from "@/components/GradientText";
import NeonCard from "@/components/NeonCard";

const headline = "Pick a game. Host locally. Have fun.";

export default function Home() {
  return (
    <main className="flex-1">
      <section className="relative overflow-hidden py-20 sm:py-28">
        <Container>
          <div className="max-w-3xl space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 120, damping: 18 }}
              className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.35em] text-white/60"
            >
              LOCAL-FIRST. NO SERVERS TO PAY.
            </motion.div>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-6xl">
              <GradientText className="bg-[length:200%_200%] animate-[text-shimmer_8s_linear_infinite]">
                {headline}
              </GradientText>
            </h1>
            <p className="text-lg text-white/60">
              FunDeck is your private game hub — host on your PC, share a link,
              and play over LAN or the internet. Party games, debate chaos, and
              casino classics.
            </p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap gap-4 text-sm text-white/60"
            >
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                Download desktop
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                Share link
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                Play in browser
              </span>
            </motion.div>
          </div>
        </Container>
      </section>

      <section className="pb-24">
        <Container>
          <div className="space-y-8">
            <NeonCard className="p-8">
              <h2 id="download" className="text-sm font-semibold uppercase tracking-[0.4em] text-white/50">
                Download
              </h2>
              <p className="mt-3 text-white/80">
                Get the desktop app to host games on your PC. Start the server,
                share your LAN or public URL (e.g. playit.gg), and friends join
                in the browser.
              </p>
              <p className="mt-2 text-sm text-white/50">
                (Releases / installers go here — e.g. GitHub Releases.)
              </p>
            </NeonCard>

            <NeonCard className="p-8">
              <h2 className="text-sm font-semibold uppercase tracking-[0.4em] text-white/50">
                How it works
              </h2>
              <ul className="mt-4 list-inside list-disc space-y-2 text-white/70">
                <li>Run the desktop app and start the server.</li>
                <li>Share your LAN or public URL (e.g. via playit.gg).</li>
                <li>Friends open the link in their browser and join rooms.</li>
              </ul>
            </NeonCard>

            <footer className="border-t border-white/10 pt-8 text-sm text-white/50">
              <Link href="/contribute" className="hover:text-white/70">
                Contribute / open source
              </Link>
            </footer>
          </div>
        </Container>
      </section>
    </main>
  );
}
