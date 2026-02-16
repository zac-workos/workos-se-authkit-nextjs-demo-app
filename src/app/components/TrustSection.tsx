import { Flex, Text } from "@radix-ui/themes";
import type { TrustStat } from "../lib/brand-config";

interface TrustSectionProps {
  heading: string;
  stats: TrustStat[];
}

export function TrustSection({ heading, stats }: TrustSectionProps) {
  return (
    <Flex direction="column" align="center" gap="4" py="6">
      <Text size="2" color="gray" weight="medium" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {heading}
      </Text>
      <Flex gap="6" align="center" justify="center" wrap="wrap">
        {stats.map((stat, i) => (
          <Flex key={i} direction="column" align="center" gap="1">
            <Text size="5" weight="bold" color="gray" highContrast>
              {stat.value}
            </Text>
            <Text size="1" color="gray">
              {stat.label}
            </Text>
          </Flex>
        ))}
      </Flex>
    </Flex>
  );
}
