import { Card, Grid, Heading, Text, Flex, Box } from "@radix-ui/themes";
import NextLink from "next/link";
import { getIcon, type QuickAction } from "../lib/brand-config";

interface QuickActionsProps {
  actions: QuickAction[];
}

export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <Grid columns={{ initial: "1", sm: "3" }} gap="4" width="100%">
      {actions.map((action, i) => {
        const Icon = getIcon(action.icon);
        return (
          <Card key={i} size="3" variant="surface" asChild>
            <NextLink href={action.href}>
              <Flex direction="column" gap="2">
                <Flex align="center" gap="2">
                  <Box style={{ color: "var(--accent-9)" }}>
                    <Icon width="18" height="18" />
                  </Box>
                  <Heading size="3" color="gray" highContrast>
                    {action.title}
                  </Heading>
                </Flex>
                <Text size="2" color="gray">
                  {action.description}
                </Text>
              </Flex>
            </NextLink>
          </Card>
        );
      })}
    </Grid>
  );
}
