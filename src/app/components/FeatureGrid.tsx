import { Card, Grid, Heading, Text, Flex, Box } from "@radix-ui/themes";
import { getIcon, type FeatureCard } from "../lib/brand-config";

interface FeatureGridProps {
  features: FeatureCard[];
}

export function FeatureGrid({ features }: FeatureGridProps) {
  return (
    <Flex direction="column" align="center" gap="5" py="6">
      <Grid columns={{ initial: "1", sm: "2" }} gap="4" width="100%" style={{ maxWidth: "700px" }}>
        {features.map((feature, i) => {
          const Icon = getIcon(feature.icon);
          return (
            <Card key={i} size="3" variant="surface">
              <Flex direction="column" gap="2">
                <Flex align="center" gap="2">
                  <Box style={{ color: "var(--accent-9)" }}>
                    <Icon width="20" height="20" />
                  </Box>
                  <Heading size="3" color="gray" highContrast>
                    {feature.title}
                  </Heading>
                </Flex>
                <Text size="2" color="gray">
                  {feature.description}
                </Text>
              </Flex>
            </Card>
          );
        })}
      </Grid>
    </Flex>
  );
}
