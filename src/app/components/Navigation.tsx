import { withAuth } from "@workos-inc/authkit-nextjs";
import { Button, Flex, Box } from "@radix-ui/themes";
import NextLink from "next/link";
import { getBrandConfig } from "../lib/brand-config";
import { SmartLogo } from "./SmartLogo";

export async function Navigation() {
  const { organizationId, user } = await withAuth({});

  const PROSPECT_LOGO = process.env.PROSPECT_LOGO;
  const brandConfig = getBrandConfig();

  if (!organizationId) {
    return PROSPECT_LOGO ? (
      <SmartLogo src={PROSPECT_LOGO} companyName={brandConfig.company.name} />
    ) : null;
  }

  return (
    <Flex gap="3" align="center">
      <Box mr="2">
        <SmartLogo src={PROSPECT_LOGO} companyName={brandConfig.company.name} />
      </Box>
      <Button asChild variant="ghost" color="gray">
        <NextLink href="/">Home</NextLink>
      </Button>
      {user && (
        <>
          <Button asChild variant="ghost" color="gray">
            <NextLink href="/integrations">Integrations</NextLink>
          </Button>
          <Button asChild variant="ghost" color="gray">
            <NextLink href="/user-settings">Settings</NextLink>
          </Button>
          <Button asChild variant="ghost" color="gray">
            <NextLink href="/logs">Logs</NextLink>
          </Button>
        </>
      )}
    </Flex>
  );
}
