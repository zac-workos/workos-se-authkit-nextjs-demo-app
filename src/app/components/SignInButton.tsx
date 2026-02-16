import { getSignInUrl, withAuth, signOut } from "@workos-inc/authkit-nextjs";
import { Button, Flex } from "@radix-ui/themes";

export async function SignInButton({ large, ctaText }: { large?: boolean; ctaText?: string }) {
  const { user } = await withAuth({ ensureSignedIn: false });
  const authorizationUrl = await getSignInUrl();

  if (user) {
    return (
      <Flex gap="3" align="center">
        <form
          action={async () => {
            "use server";
            await signOut();
          }}
        >
          <Button type="submit" size={large ? "3" : "2"} variant="soft" color="gray">
            Sign Out
          </Button>
        </form>
      </Flex>
    );
  }

  return (
    <Button asChild size={large ? "3" : "2"} variant="solid">
      <a href={authorizationUrl}>{ctaText || (large ? "Sign In with AuthKit" : "Sign In")}</a>
    </Button>
  );
}
