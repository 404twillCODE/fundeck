import { cn } from "@/lib/utils";

type GradientTextProps = {
  children: React.ReactNode;
  className?: string;
};

export default function GradientText({ children, className }: GradientTextProps) {
  return (
    <span className={cn("gradient-text", className)}>
      {children}
    </span>
  );
}
