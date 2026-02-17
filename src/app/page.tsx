import { withAuth } from "@workos-inc/authkit-nextjs";
import { Flex } from "@radix-ui/themes";
import { getBrandConfig } from "./lib/brand-config";
import { HeroSection } from "./components/HeroSection";
import { DashboardWelcome } from "./components/DashboardWelcome";
import { QuickActions } from "./components/QuickActions";
import { StatusSummary } from "./components/StatusSummary";

export default async function HomePage() {
  const { user } = await withAuth();
  const config = getBrandConfig();

  if (user) {
    const firstName = user.firstName || user.email?.split("@")[0] || "there";
    const companyName = config.company.name;

    return (
      <Flex direction="column" gap="5" p="5" style={{ width: "100%" }}>
        <DashboardWelcome
          welcomeHeading={config.dashboard.welcomeHeading}
          welcomeSubheading={config.dashboard.welcomeSubheading}
          firstName={firstName}
          companyName={companyName}
        />
        <QuickActions actions={config.quickActions} />
        <StatusSummary items={config.dashboard.statusItems} />
      </Flex>
    );
  }

  return (
    <Flex direction="column" align="center" style={{ width: "100%" }}>
      <HeroSection
        heading={config.hero.heading}
        subheading={config.hero.subheading}
        ctaText={config.hero.ctaText}
      />
    </Flex>
  );
}
