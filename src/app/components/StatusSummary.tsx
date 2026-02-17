import { Flex, Text, Badge, Card } from "@radix-ui/themes";
import { getIcon } from "../lib/brand-config";

interface StatusItem {
  label: string;
  value: string;
  icon: string;
}

interface StatusSummaryProps {
  items: StatusItem[];
}

export function StatusSummary({ items }: StatusSummaryProps) {
  return (
    <Card variant="surface" size="2">
      <Flex justify="between" align="center" wrap="wrap" gap="4" p="2">
        {items.map((item, i) => {
          const Icon = getIcon(item.icon);
          return (
            <Flex key={i} align="center" gap="2">
              <Icon width="16" height="16" style={{ color: "var(--gray-9)" }} />
              <Text size="2" color="gray">
                {item.label}
              </Text>
              <Badge variant="soft" color="green" size="1">
                {item.value}
              </Badge>
            </Flex>
          );
        })}
      </Flex>
    </Card>
  );
}
