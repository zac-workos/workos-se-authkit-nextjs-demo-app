"use client";

import { useCallback, useState } from "react";
import { Flex, Text } from "@radix-ui/themes";

interface SmartLogoProps {
  src: string;
  companyName: string;
  height?: string;
}

export function SmartLogo({ src, companyName, height = "30px" }: SmartLogoProps) {
  const [isSquare, setIsSquare] = useState<boolean | null>(null);

  const checkDimensions = (img: HTMLImageElement) => {
    if (img.naturalWidth > 0) {
      const ratio = img.naturalWidth / img.naturalHeight;
      setIsSquare(ratio < 1.5);
    }
  };

  const imgRef = useCallback((img: HTMLImageElement | null) => {
    if (img && img.complete) {
      checkDimensions(img);
    }
  }, []);

  return (
    <Flex align="center" gap="3">
      <img
        ref={imgRef}
        src={src}
        alt={`${companyName} logo`}
        style={{ height, width: "auto", visibility: isSquare === null ? "hidden" : "visible" }}
        onLoad={(e) => checkDimensions(e.currentTarget)}
      />
      {isSquare && (
        <Text size="4" weight="bold" color="gray" highContrast>
          {companyName}
        </Text>
      )}
    </Flex>
  );
}
