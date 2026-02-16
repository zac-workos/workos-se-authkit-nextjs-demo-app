import { withAuth } from "@workos-inc/authkit-nextjs";
import { Flex } from "@radix-ui/themes";
import { SignInButton } from "./SignInButton";
import { OrgSwitcher } from "./OrgSwitcher";

export async function HeaderActions() {
  const { user } = await withAuth({ ensureSignedIn: false });

  if (!user) {
    return null;
  }

  return (
    <Flex gap="3" align="center">
      <OrgSwitcher />
      <SignInButton />
    </Flex>
  );
}
