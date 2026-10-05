import { cn } from "@/shared/lib/utils";
import { DESCRIPCION_SISTEMA, LOGO_SISTEMA, NOMBRE_SISTEMA } from "@/shared/lib/brand";

type BrandLockupProps = {
  size?: "sm" | "md" | "lg";
  as?: "p" | "h1" | "h2";
  className?: string;
  nameClassName?: string;
};

const sizes = {
  sm: { logo: "h-8 w-8", name: "text-sm font-bold" },
  md: { logo: "h-10 w-10", name: "text-base font-bold" },
  lg: { logo: "h-12 w-12 sm:h-16 sm:w-16", name: "text-2xl sm:text-3xl md:text-5xl font-bold drop-shadow-2xl" },
};

export function BrandLockup({ size = "md", as = "p", className, nameClassName }: BrandLockupProps) {
  const s = sizes[size];
  const NameTag = as;

  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <img src={LOGO_SISTEMA} alt={NOMBRE_SISTEMA} className={cn(s.logo, "shrink-0 object-contain")} />
      <NameTag className={cn("leading-tight text-primary whitespace-nowrap", s.name, nameClassName)} translate="no">
        {NOMBRE_SISTEMA}
      </NameTag>
    </div>
  );
}

export function BrandFooterLogo({ className }: { className?: string }) {
  return (
    <img
      src="/logos/logo_injoe_white.png"
      alt={NOMBRE_SISTEMA}
      className={cn("h-full w-full object-contain p-2", className)}
    />
  );
}

export { DESCRIPCION_SISTEMA, NOMBRE_SISTEMA };
