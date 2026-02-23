export default function AnimatedBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute -left-24 top-[-10%] h-[420px] w-[420px] rounded-full aurora-blob motion-heavy" />
      <div className="absolute right-[-6%] top-[20%] h-[520px] w-[520px] rounded-full aurora-blob motion-heavy opacity-70" />
      <div className="absolute bottom-[-15%] left-[25%] h-[480px] w-[480px] rounded-full aurora-blob motion-heavy opacity-80" />
      <div className="absolute inset-0 grid-overlay motion-heavy" />
      <div className="absolute inset-0 noise-overlay" />
    </div>
  );
}
