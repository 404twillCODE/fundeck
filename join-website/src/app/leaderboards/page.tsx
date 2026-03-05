"use client";

import Container from "@/components/Container";
import GradientText from "@/components/GradientText";
import NeonCard from "@/components/NeonCard";

export default function LeaderboardsPage() {
  return (
    <main className="flex-1 py-16">
      <Container className="space-y-6">
        <div className="space-y-2">
          <GradientText className="text-xs uppercase tracking-[0.35em]">Leaderboards</GradientText>
          <h1 className="text-4xl font-semibold text-white">Coming Soon</h1>
        </div>
        <NeonCard className="p-6 text-white/70">
          Leaderboards are not available yet. Stats will be tracked in a future update.
        </NeonCard>
      </Container>
    </main>
  );
}
