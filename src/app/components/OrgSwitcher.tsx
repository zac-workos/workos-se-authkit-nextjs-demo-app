import { withAuth } from "@workos-inc/authkit-nextjs";
import { Flex } from "@radix-ui/themes";
import { OrganizationSwitcherWidget } from "./Widgets";
import { workos } from "../workos";

export async function OrgSwitcher() {
  const { user, organizationId } = await withAuth({});

  if (!user || !organizationId) {
    return null;
  }

  try {
    const authToken = await (workos.widgets as any).getToken({
      userId: user.id,
      organizationId,
      scopes: [
        "widgets:users-table:manage",
        "widgets:sso:manage",
        "widgets:api-keys:manage",
        "widgets:domain-verification:manage",
      ],
    });

    return (
      <Flex key={organizationId} style={{ height: "32px" }}>
        <OrganizationSwitcherWidget authToken={authToken} />
      </Flex>
    );
  } catch (err) {
    console.error("Failed to get widget token for org switcher:", err);
    return null;
  }
}
