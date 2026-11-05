import { brandColors } from '@/constants/designTokens';
import Svg, { Path } from 'react-native-svg';

interface LeafLogoProps {
  /** Rendered width and height of the logo in logical pixels. */
  size?: number;
}

/**
 * The ExpenseTracker brand mark.
 *
 * A scalable emerald leaf with a light central vein and a short stem, traced
 * to match the reference splash artwork. Rendered with react-native-svg so it
 * stays crisp at any size.
 */
const LeafLogo = ({ size = 72 }: LeafLogoProps) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    accessible
    accessibilityLabel="ExpenseTracker logo"
  >
    <Path
      d="M32 7 C 22 6, 11 11, 12 19 C 9 33, 18 50, 30 57 C 36 52, 48 34, 50 21 C 53 10, 43 5, 32 7 Z"
      fill={brandColors.primary}
    />
    <Path
      d="M40 15 C 35 24, 29 33, 24 42"
      stroke={brandColors.hillMintLight}
      strokeWidth={2}
      strokeLinecap="round"
      fill="none"
    />
    <Path
      d="M27 52 C 22 55, 18 58, 15 61"
      stroke={brandColors.primaryDark}
      strokeWidth={2}
      strokeLinecap="round"
      fill="none"
    />
  </Svg>
);

LeafLogo.displayName = 'LeafLogo';

export default LeafLogo;
