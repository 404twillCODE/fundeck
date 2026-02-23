import { cn } from "@/lib/utils";

type NeonCardProps = {
  children: React.ReactNode;
  className?: string;
};

export default function NeonCard({ children, className }: NeonCardProps) {
  return (
    <div
      className={cn(
        "neon-card relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_24px_80px_rgba(5,6,10,0.65)] backdrop-blur-xl",
        className,
      )}
    >
      <span aria-hidden="true" className="neon-border" />
      <span aria-hidden="true" className="shine-sweep" />
      {children}
    </div>
  );
}
