import React from "react";
import { View } from "react-native";

/**
 * Decorative gradient blob for screen backgrounds.
 * Implemented using a View with box-shadow (no expo-linear-gradient dependency needed for simple blobs).
 */
interface BlobProps {
  color: string;
  size?: number;
  style?: object;
  opacity?: number;
}

export function Blob({ color, size = 260, style, opacity = 0.18 }: BlobProps) {
  return (
    <View
      style={[
        {
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity,
        },
        style,
      ]}
    />
  );
}
