import Image from 'next/image';

interface CallLabLogoProps {
  variant?: 'wide' | 'square' | 'horizontal';
  className?: string;
}

/**
 * CallLabLogo Component
 *
 * Variants:
 * - wide: Full "SALESOS CALL LAB" horizontal logo (for headers)
 * - square: Square version of the logo (for compact spaces)
 * - horizontal: "CALL LAB" only horizontal logo
 *
 * Logo files should be placed in /public/logos/:
 * - call-lab-wide.png
 * - call-lab-square.png
 * - call-lab-horizontal.png
 */
export function CallLabLogo({ variant = 'wide', className = '' }: CallLabLogoProps) {
  const logoConfig = {
    wide: {
      src: '/logos/call-lab-wide.png',
      width: 300,
      height: 120,
      alt: 'SalesOS Call Lab',
    },
    square: {
      src: '/logos/call-lab-square.png',
      width: 200,
      height: 200,
      alt: 'SalesOS Call Lab',
    },
    horizontal: {
      src: '/logos/call-lab-horizontal.png',
      width: 250,
      height: 80,
      alt: 'Call Lab',
    },
  };

  const config = logoConfig[variant];

  return (
    <Image
      src={config.src}
      width={config.width}
      height={config.height}
      alt={config.alt}
      className={className}
      priority
    />
  );
}

export default CallLabLogo;
