import Link from "next/link";
import Container from "@/components/Container";

export default function HostPage() {
  return (
    <main className="flex-1 py-16">
      <Container className="max-w-xl">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-white/80 space-y-4">
          <h1 className="text-2xl font-semibold text-white">Host Dashboard</h1>
          <p className="text-white/60">
            The host dashboard has moved to the FunDeck desktop app. Download and run the desktop app to host games.
          </p>
          <p className="text-white/60">
            If you&apos;re a player looking to join a game, ask your host for the room code or join link.
          </p>
          <Link
            href="/"
            className="inline-flex rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/80"
          >
            Back to Home
          </Link>
        </div>
      </Container>
    </main>
  );
}
