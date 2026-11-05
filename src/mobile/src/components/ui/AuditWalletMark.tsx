import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

interface AuditWalletMarkProps {
  /** Rendered width and height in logical pixels. */
  size?: number;
  /** Visual variant: a navy rounded-square badge or a transparent white monogram. */
  variant?: 'navy' | 'mark-white';
}

/**
 * The approved AuditWallet A2 growth monogram rendered as a vector.
 *
 * The mark is a clean reconstruction of the brand kit's "A" with an upward
 * growth arrow, including the kit's mint-to-emerald gradient for the badge
 * variant and a white monogram for use inside the navy header cards.
 */
const AuditWalletMark = ({
  size = 72,
  variant = 'navy',
}: AuditWalletMarkProps) => {
  const isMarkOnly = variant === 'mark-white';
  const monogramFill = isMarkOnly ? '#FFFFFF' : 'url(#auditWalletA2Grad)';

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      accessible
      accessibilityLabel="ExpenseTracker logo"
    >
      <Defs>
        <LinearGradient
          id="auditWalletA2Grad"
          x1="0"
          y1="0"
          x2="1"
          y2="1"
        >
          <Stop offset="0" stopColor="#86F8B8" />
          <Stop offset="0.55" stopColor="#1DD68B" />
          <Stop offset="1" stopColor="#008A71" />
        </LinearGradient>
      </Defs>
      {!isMarkOnly ? (
        <Path
          d="M112 0 H400 Q512 0 512 112 V400 Q512 512 400 512 H112 Q0 512 0 400 V112 Q0 0 112 0 Z"
          fill="#0D1B2E"
        />
      ) : null}
      <Path
        d="M76 405 L205 112 Q233 51 273 112 L425 405 L342 405 L248 202 L159 405 Z"
        fill={monogramFill}
      />
      <Path
        d="M99 316 Q224 364 394 208 L376 196 L448 172 L433 249 L417 227 Q262 393 99 316 Z"
        fill="#FFFFFF"
      />
    </Svg>
  );
};

AuditWalletMark.displayName = 'AuditWalletMark';

export default AuditWalletMark;
