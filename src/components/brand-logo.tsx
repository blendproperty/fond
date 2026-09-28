type BrandLogoProps = {
  className?: string;
};

export function BrandLogo({ className = '' }: BrandLogoProps) {
  return (
    <img
      className={`brand-logo ${className}`.trim()}
      src="/brand/midpoint-cafe-powered-by-fond.svg"
      width={2092}
      height={413}
      alt="Midpoint Cafe powered by fond"
    />
  );
}
