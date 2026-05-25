import React from "react";
import Svg, {
    Defs,
    G,
    LinearGradient,
    Path,
    Rect,
    Stop,
    Text,
    TSpan,
} from "react-native-svg";

interface LogoProps {
  width?: number | string;
  height?: number | string;
}

export default function RomajiFyLogo({ width = 200, height = 60 }: LogoProps) {
  return (
    <Svg viewBox="0 0 500 150" width={width} height={height}>
      <Defs>
        <LinearGradient id="neonGreen" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#1DB954" />
          <Stop offset="100%" stopColor="#1ed760" />
        </LinearGradient>
      </Defs>

      {/* Transparent background so it fits into your existing navbar row seamlessly */}
      <Rect width="100%" height="100%" fill="transparent" />

      <G transform="translate(25, 15)">
        {/* Icon: Soundwave R-Symbol */}
        <G>
          <Rect
            x="20"
            y="30"
            width="8"
            height="60"
            rx="4"
            fill="url(#neonGreen)"
          />
          <Rect
            x="34"
            y="40"
            width="8"
            height="40"
            rx="4"
            fill="url(#neonGreen)"
          />
          <Path
            d="M 42 40 C 75 40, 85 60, 42 70"
            fill="none"
            stroke="url(#neonGreen)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <Path
            d="M 50 70 L 80 100"
            fill="none"
            stroke="url(#neonGreen)"
            strokeWidth="8"
            strokeLinecap="round"
          />
        </G>

        {/* Typography Design */}
        <Text
          x="110"
          y="72"
          fontFamily="System"
          fontWeight="900"
          fontSize="46"
          fill="#FFFFFF"
          letterSpacing={0.5}
        >
          Romaji<TSpan fill="#1DB954">Fy</TSpan>
        </Text>

        {/* Subtitle Description */}
        <Text
          x="112"
          y="96"
          fontFamily="System"
          fontWeight="600"
          fontSize="13"
          fill="#666666"
          letterSpacing={3}
        >
          LYRICS TRANSLITERATOR
        </Text>
      </G>
    </Svg>
  );
}
