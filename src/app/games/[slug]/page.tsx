import Link from "next/link";

import Badge from "@/components/Badge";
import Container from "@/components/Container";
import GradientText from "@/components/GradientText";
import NeonCard from "@/components/NeonCard";
import { games } from "@/data/games";

type GamePageProps = {
  params: { slug: string };
};

export async function generateStaticParams() {
  return games.map((game) => ({ slug: game.slug }));
}

export default function GamePage({ params }: GamePageProps) {
  const game = games.find((item) => item.slug === params.slug);
  const title = game?.name ?? "Unknown Game";
  const category = game?.category ?? "Social";
  const status = game?.status ?? "wip";

  return (
    <main className="flex-1 pb-24 pt-16">
      <Container>
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <GradientText className="text-sm uppercase tracking-[0.4em]">
              Game lounge
            </GradientText>
            <h1 className="text-4xl font-semibold text-white sm:text-6xl">
              {title}
            </h1>
            <Badge label={category} />
          </div>
          <Link
            href="/games"
            className="rounded-full border border-white/10 bg-white/10 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/70 transition hover:text-white"
          >
            Back to games
          </Link>
        </div>
      </Container>

      <Container>
        <div className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <NeonCard className="p-8">
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold text-white">
                  {status === "wip" ? "Work in Progress" : "Now Live"}
                </h2>
                {status === "wip" ? (
                  <p className="text-white/60">
                    This one&apos;s cooking. Check back soon.
                  </p>
                ) : (
                  <p className="text-white/60">
                    Live gameplay is ready for the table.
                  </p>
                )}
              </div>
            </NeonCard>
            {status === "wip" ? (
              <NeonCard className="p-8">
                <div className="space-y-4">
                  <p className="text-sm uppercase tracking-[0.4em] text-white/50">
                    Planned features
                  </p>
                  <ul className="space-y-2 text-sm text-white/60">
                    <li className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                      Lobby creation and invite flow
                    </li>
                    <li className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                      Live turn indicators and timers
                    </li>
                    <li className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                      Match history and stat recap
                    </li>
                  </ul>
                </div>
              </NeonCard>
            ) : (
              <NeonCard className="min-h-[320px] p-8">
                <div className="flex h-full flex-col items-center justify-center text-center text-white/50">
                  <p className="text-sm uppercase tracking-[0.4em]">
                    Live game UI
                  </p>
                  <p className="mt-3 text-lg text-white/70">
                    Gameplay loads directly on this route.
                  </p>
                </div>
              </NeonCard>
            )}
          </div>

          <div className="space-y-6">
            <NeonCard className="p-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Players</h3>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                  Placeholder for player list and lobby info.
                </div>
              </div>
            </NeonCard>
            <NeonCard className="p-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Rules</h3>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                  Placeholder for quick rules and game mode notes.
                </div>
              </div>
            </NeonCard>
            <NeonCard className="p-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Status</h3>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                  Placeholder for match status and live metadata.
                </div>
              </div>
            </NeonCard>
          </div>
        </div>
      </Container>
    </main>
  );
}
