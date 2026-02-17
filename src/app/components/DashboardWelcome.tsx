import { Flex, Heading, Text, Separator } from "@radix-ui/themes";

interface DashboardWelcomeProps {
  welcomeHeading: string;
  welcomeSubheading: string;
  firstName: string;
  companyName: string;
}

export function DashboardWelcome({
  welcomeHeading,
  welcomeSubheading,
  firstName,
  companyName,
}: DashboardWelcomeProps) {
  const heading = welcomeHeading
    .replace("{{firstName}}", firstName)
    .replace("{{companyName}}", companyName);
  const subheading = welcomeSubheading
    .replace("{{firstName}}", firstName)
    .replace("{{companyName}}", companyName);

  return (
    <Flex direction="column" gap="2" py="4">
      <Heading size="6" color="gray" highContrast>
        {heading}
      </Heading>
      <Text size="3" color="gray">
        {subheading}
      </Text>
      <Separator size="4" my="2" />
    </Flex>
  );
}
