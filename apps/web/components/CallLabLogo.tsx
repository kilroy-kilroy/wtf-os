import Image from 'next/image';

type CallLabVariant = 'wide' | 'square' | 'horizontal';
type CallLabProVariant = 'pro-wide' | 'pro-square' | 'pro-horizontal' | 'pro-stacked';

interface CallLabLogoProps {
  variant?: CallLabVariant | CallLabProVariant;
  className?: string;
}

/**
 * CallLabLogo Component
 *
 * Call Lab variants:
 * - wide: Full "SALESOS CALL LAB" horizontal logo
 * - square: Square version of the logo
 * - horizontal: "CALL LAB" only horizontal logo
 *
 * Call Lab Pro variants:
 * - pro-wide: Full "SALESOS CALL LAB PRO" wide horizontal
 * - pro-square: Square "CALL LAB PRO" stacked
 * - pro-horizontal: "CALL LAB PRO" horizontal
 * - pro-stacked: Square "SALESOS CALL LAB PRO" stacked
 *
 * Logo files should be placed in /public/logos/
 */
export function CallLabLogo({ variant = 'wide', className = '' }: CallLabLogoProps) {
  const logoConfig: Record<string, { src: string; width: number; height: number; alt: string }> = {
    // Call Lab (free)
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
    // Call Lab Pro
    'pro-wide': {
      src: '/logos/call-lab-pro-wide.png',
      width: 350,
      height: 120,
      alt: 'SalesOS Call Lab Pro',
    },
    'pro-square': {
      src: '/logos/call-lab-pro-square.png',
      width: 200,
      height: 200,
      alt: 'Call Lab Pro',
    },
    'pro-horizontal': {
      src: '/logos/call-lab-pro-horizontal.png',
      width: 300,
      height: 80,
      alt: 'Call Lab Pro',
    },
    'pro-stacked': {
      src: '/logos/call-lab-pro-stacked.png',
      width: 200,
      height: 200,
      alt: 'SalesOS Call Lab Pro',
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
