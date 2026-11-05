import { brandColors } from '@/constants/designTokens';
import Svg, { Circle, Path } from 'react-native-svg';

/**
 * Decorative flat-vector landscape for the welcome screen.
 *
 * Layered rolling hills in mint and emerald shades behind a warm golden sun.
 * The component fills its parent, which is responsible for the aspect ratio.
 */
const WelcomeLandscape = () => (
  <Svg width="100%" height="100%" viewBox="0 0 375 156" accessible={false}>
    <Circle cx={272} cy={27} r={21} fill={brandColors.sun} />
    <Path
      d="M0 70 C 26 50, 62 26, 120 24 C 168 22, 198 38, 226 56 L 226 72 L 0 72 Z"
      fill={brandColors.hillMintLight}
    />
    <Path
      d="M216 58 C 248 40, 292 28, 340 30 C 362 31, 370 38, 375 43 L 375 80 L 216 80 Z"
      fill={brandColors.hillMintLight}
    />
    <Path
      d="M0 84 C 62 62, 146 54, 232 62 C 298 69, 344 80, 375 88 L 375 156 L 0 156 Z"
      fill={brandColors.hillMint}
    />
    <Path
      d="M0 104 C 76 86, 168 92, 250 102 C 304 109, 346 118, 375 124 L 375 156 L 0 156 Z"
      fill={brandColors.hillMid}
    />
    <Path
      d="M0 128 C 40 114, 82 110, 122 121 C 152 129, 170 116, 206 114 C 256 111, 316 118, 375 130 L 375 156 L 0 156 Z"
      fill={brandColors.hillEmerald}
    />
  </Svg>
);

WelcomeLandscape.displayName = 'WelcomeLandscape';

export default WelcomeLandscape;
