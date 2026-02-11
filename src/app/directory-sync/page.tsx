import { withAuth } from "@workos-inc/authkit-nextjs";
import { Text, Heading, Flex, Box } from "@radix-ui/themes";
import { workos } from "../workos";
import { DsyncEventStream } from "../components/DsyncEventStream";
import PortalButton from "../components/PortalButton";

export default async function DirectorySyncPage() {
  const { role, organizationId, user } = await withAuth({
    ensureSignedIn: true,
  });

  if (!organizationId) {
    return (
      <Flex direction="column" gap="2" align="center">
        <Heading size="5">Directory Sync</Heading>
        <Text size="3" color="gray">
          You need to belong to an organization to view directory sync.
        </Text>
      </Flex>
    );
  }

  let directories: { id: string; state: string; domain?: string; name?: string }[] = [];
  let dsyncEnabled = false;
  try {
    const { data } = await workos.directorySync.listDirectories({
      organizationId,
    });
    directories = data ?? [];
    dsyncEnabled = directories.some((d) => d.state === "active");
  } catch (e) {
    console.error("Failed to list directories:", e);
  }

  return (
    <Flex
      direction="column"
      width="100%"
      style={{ maxWidth: "900px", margin: "0 auto" }}
      gap="5"
    >
      <Heading size="5">Directory Sync</Heading>

      {role !== "admin" ? (
        <Text size="3" color="gray">
          Only admins can view Directory Sync. Switch to an admin role or ask your org admin to enable Directory Sync.
        </Text>
      ) : (
        <>
          <Box
            style={{
              padding: 16,
              borderRadius: "var(--radius-3)",
              border: "1px solid var(--gray-5)",
              backgroundColor: "var(--gray-1)",
            }}
          >
            <Text size="3" weight="bold" as="div" mb="2">
              Connection status
            </Text>
            {dsyncEnabled ? (
              <Flex direction="column" gap="2">
                <Text size="2" color="green">
                  Directory Sync is connected for this organization.
                </Text>
                {directories.filter((d) => d.state === "active").length > 0 && (
                  <Text size="2" color="gray">
                    {directories.filter((d) => d.state === "active").length} active directory
                    (directories) linked. Events from your directory provider will appear below.
                  </Text>
                )}
                <PortalButton organizationId={organizationId} intent="dsync" />
              </Flex>
            ) : (
              <Flex direction="column" gap="2">
                <Text size="2" color="gray">
                  No directory connected yet. Connect a directory via the Admin Portal to start syncing users and groups; events will appear below as they occur.
                </Text>
                <PortalButton organizationId={organizationId} intent="dsync" />
              </Flex>
            )}
          </Box>

          <Box>
            <Text size="3" weight="bold" as="div" mb="2">
              DSync events
            </Text>
            <Text size="2" color="gray" as="div" mb="3">
              User and group lifecycle events (created, updated, deleted, group membership) for this organization.
            </Text>
            <DsyncEventStream organizationId={organizationId} />
          </Box>
        </>
      )}
    </Flex>
  );
}
