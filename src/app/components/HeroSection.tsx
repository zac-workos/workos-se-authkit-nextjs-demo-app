import { Flex, Heading, Text } from "@radix-ui/themes";
import { SignInButton } from "./SignInButton";

interface HeroSectionProps {
  heading: string;
  subheading: string;
  ctaText: string;
}

export function HeroSection({ heading, subheading, ctaText }: HeroSectionProps) {
  return (
    <Flex direction="column" align="center" gap="5" py="9" style={{ textAlign: "center" }}>
      <Heading size="8" color="gray" highContrast style={{ maxWidth: "700px" }}>
        {heading}
      </Heading>
      <Text size="4" color="gray" style={{ maxWidth: "600px", lineHeight: "1.6" }}>
        {subheading}
      </Text>
      <SignInButton large ctaText={ctaText} />
    </Flex>
  );
}
