import { withAuth } from "@workos-inc/authkit-nextjs";
import { Text, Heading, Flex, Tabs } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import "../styles/tabs.css";
import Link from "next/link";
import { workos } from "../workos";
import { Octokit } from "@octokit/rest";
import { auth, calendar } from "@googleapis/calendar";
import { GoogleAgenda } from "../components/GoogleAgenda";
import {
  GitHubLogoIcon,
  CalendarIcon,
  RowsIcon,
  FileTextIcon,
  ChatBubbleIcon,
  ArchiveIcon,
} from "@radix-ui/react-icons";

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { role, organizationId, user, sessionId } = await withAuth({
    ensureSignedIn: true,
  });

  if (!organizationId) {
    return <p>User does not belong to an organization</p>;
  }

  const validTabs = [
    "github-data-integration",
    "google-calendar-integration",
    "linear",
    "notion",
    "slack",
    "dropbox",
  ] as const;

  const resolvedSearchParams = await searchParams;
  const tabParam =
    typeof resolvedSearchParams.tab === "string"
      ? resolvedSearchParams.tab
      : undefined;
  const activeTab =
    tabParam && validTabs.includes(tabParam as (typeof validTabs)[number])
      ? tabParam
      : "github-data-integration";

  // GitHub integration
  let githubUser: any = null;
  let githubError: string | null = null;
  if (activeTab === "github-data-integration") {
    try {
      const tokenResp = await workos.pipes.getAccessToken({
        provider: "github",
        userId: user.id,
        organizationId,
      });
      if (!tokenResp.active) {
        githubError =
          "GitHub token not available. User may need to connect or re-authorize." +
          (tokenResp.error ? ` Details: ${tokenResp.error}` : "");
      } else {
        const pipesToken = tokenResp.accessToken;
        if (
          Array.isArray(pipesToken.missingScopes) &&
          pipesToken.missingScopes.includes("user")
        ) {
          githubError =
            'Missing required "user" scope. Ask the user to re-authorize with the correct permissions.';
        } else {
          const octokit = new Octokit({ auth: pipesToken.accessToken });
          const { data: authedUser } =
            await octokit.rest.users.getAuthenticated();
          const username = authedUser.login;
          const { data: publicOrgs } = await octokit.rest.orgs.listForUser({
            username,
            per_page: 100,
          });
          const { data: repos } =
            await octokit.rest.repos.listForAuthenticatedUser({
              visibility: "public",
              per_page: 100,
            });
          const topRepos = [...repos]
            .sort(
              (a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0)
            )
            .slice(0, 5)
            .map((r) => ({
              id: r.id,
              name: r.name,
              full_name: r.full_name,
              html_url: r.html_url,
              description: r.description,
              stargazers_count: r.stargazers_count,
              language: r.language,
            }));
          const languageCounts: Record<string, number> = {};
          for (const r of repos) {
            if (r.language) {
              languageCounts[r.language] =
                (languageCounts[r.language] || 0) + 1;
            }
          }
          githubUser = {
            user: authedUser,
            publicOrgs,
            topRepos,
            languageCounts,
          };
        }
      }
    } catch (err) {
      try {
        githubError = `Failed to fetch GitHub user: ${JSON.stringify(err)}`;
      } catch {
        githubError = `Failed to fetch GitHub user: ${String(err)}`;
      }
    }
  }



  // Google Calendar integration
  let googleCalendarData: any = null;
  let googleCalendarError: string | null = null;
  if (activeTab === "google-calendar-integration") {
    try {
      const tokenResp = await workos.pipes.getAccessToken({
        provider: "google-calendar",
        userId: user.id,
        organizationId,
      });
      if (!tokenResp.active) {
        googleCalendarError =
          "Google Calendar token not available. User may need to connect or re-authorize." +
          (tokenResp.error ? ` Details: ${tokenResp.error}` : "");
      } else {
        const requiredScope =
          "https://www.googleapis.com/auth/calendar.readonly";
        if (
          Array.isArray(tokenResp.accessToken.missingScopes) &&
          tokenResp.accessToken.missingScopes.includes(requiredScope)
        ) {
          googleCalendarError = `Missing required "${requiredScope}" scope. Ask the user to re-authorize with the correct permissions.`;
        } else {
          const oauth2Client = new auth.OAuth2();
          oauth2Client.setCredentials({
            access_token: tokenResp.accessToken.accessToken,
          });
          const cal = calendar({ version: "v3", auth: oauth2Client });
          // All calendars with pagination
          const calendars: any[] = [];
          let pageToken: string | undefined = undefined;
          do {
            const { data }: { data: any } = await cal.calendarList.list({
              maxResults: 250,
              pageToken,
            } as any);
            calendars.push(...(data.items || []));
            pageToken = (data.nextPageToken as string | undefined) || undefined;
          } while (pageToken);
          const selectedCalendars = calendars.filter(
            (c) => c.accessRole && c.accessRole !== "freeBusyReader"
          );
          // Time window: next 7 days
          const now = new Date();
          const start = new Date(now);
          start.setHours(0, 0, 0, 0);
          const end = new Date(start);
          end.setDate(end.getDate() + 7);
          const timeMin = start.toISOString();
          const timeMax = end.toISOString();
          // Events
          const eventsPerCal = await Promise.all(
            selectedCalendars.map(async (c: any) => {
              try {
                const { data: evData } = await cal.events.list({
                  calendarId: c.id,
                  timeMin,
                  timeMax,
                  singleEvents: true,
                  orderBy: "startTime",
                  maxResults: 100,
                });
                return { calendar: c, events: evData.items || [] };
              } catch {
                return { calendar: c, events: [] as any[] };
              }
            })
          );
          const combinedEvents = eventsPerCal
            .flatMap(({ calendar, events }) =>
              events.map((ev: any) => ({
                ...ev,
                _calendarId: calendar.id,
                _calendarSummary: calendar.summary,
                _calendarBg: calendar.backgroundColor || "var(--accent-9)",
                _calendarFg: calendar.foregroundColor || "white",
              }))
            )
            .sort((a: any, b: any) => {
              const aStart = a.start?.dateTime || a.start?.date || "";
              const bStart = b.start?.dateTime || b.start?.date || "";
              return aStart.localeCompare(bStart);
            });
          const formatDateKey = (dStr: string) => {
            const d = new Date(dStr);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
          };
          const eventsByDay: Record<string, any[]> = {};
          for (const ev of combinedEvents) {
            const startStr = ev.start?.dateTime || ev.start?.date;
            if (!startStr) continue;
            const key = formatDateKey(startStr);
            if (!eventsByDay[key]) eventsByDay[key] = [];
            eventsByDay[key].push(ev);
          }
          googleCalendarData = {
            calendars: selectedCalendars,
            eventsByDay,
            timeMin,
            timeMax,
          };
        }
      }
    } catch (err) {
      try {
        googleCalendarError = `Failed to fetch Google Calendar token: ${JSON.stringify(
          err
        )}`;
      } catch {
        googleCalendarError = `Failed to fetch Google Calendar token: ${String(
          err
        )}`;
      }
    }
  }

  // Dropbox integration
  let dropboxData: any = null;
  let dropboxError: string | null = null;
  if (activeTab === "dropbox") {
    try {
      const tokenResp = await workos.pipes.getAccessToken({
        provider: "dropbox",
        userId: user.id,
        organizationId,
      });
      if (!tokenResp.active) {
        dropboxError =
          "Dropbox token not available. User may need to connect or re-authorize." +
          (tokenResp.error ? ` Details: ${tokenResp.error}` : "");
      } else {
        const pipesToken = tokenResp.accessToken;
        const dropboxToken = pipesToken.accessToken;

        try {
          // Fetch current account info
          const accountResponse = await fetch(
            "https://api.dropboxapi.com/2/users/get_current_account",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${dropboxToken}`,
                "Content-Type": "application/json",
              },
              body: "null",
            }
          );

          if (!accountResponse.ok) {
            const errorText = await accountResponse.text();
            dropboxError = `Failed to fetch Dropbox account (${accountResponse.status}): ${accountResponse.statusText}. Details: ${errorText}`;
          } else {
            const accountData = await accountResponse.json();

            // Fetch space usage
            const spaceResponse = await fetch(
              "https://api.dropboxapi.com/2/users/get_space_usage",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${dropboxToken}`,
                  "Content-Type": "application/json",
                },
                body: "null",
              }
            );

            let spaceData = null;
            if (spaceResponse.ok) {
              spaceData = await spaceResponse.json();
            }

            // Fetch list of files/folders in root
            const listFolderResponse = await fetch(
              "https://api.dropboxapi.com/2/files/list_folder",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${dropboxToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  path: "",
                  limit: 50,
                  include_deleted: false,
                }),
              }
            );

            let filesData = null;
            if (listFolderResponse.ok) {
              filesData = await listFolderResponse.json();
            }

            dropboxData = {
              account: accountData,
              space: spaceData,
              files: filesData?.entries || [],
            };
          }
        } catch (apiErr) {
          try {
            dropboxError = `Failed to fetch Dropbox data: ${JSON.stringify(apiErr)}`;
          } catch {
            dropboxError = `Failed to fetch Dropbox data: ${String(apiErr)}`;
          }
        }
      }
    } catch (err) {
      try {
        dropboxError = `Failed to fetch Dropbox token: ${JSON.stringify(err)}`;
      } catch {
        dropboxError = `Failed to fetch Dropbox token: ${String(err)}`;
      }
    }
  }

  // Slack integration
  let slackData: any = null;
  let slackError: string | null = null;
  if (activeTab === "slack") {
    try {
      const tokenResp = await workos.pipes.getAccessToken({
        provider: "slack",
        userId: user.id,
        organizationId,
      });
      if (!tokenResp.active) {
        slackError =
          "Slack token not available. User may need to connect or re-authorize." +
          (tokenResp.error ? ` Details: ${tokenResp.error}` : "");
      } else {
        const pipesToken = tokenResp.accessToken;
        const slackToken = pipesToken.accessToken;

        // Fetch team info and users using Slack Web API
        try {
          // Get team info
          const teamInfoResponse = await fetch("https://slack.com/api/auth.test", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${slackToken}`,
              "Content-Type": "application/json",
            },
          });

          if (!teamInfoResponse.ok) {
            slackError = `Failed to fetch Slack team info: ${teamInfoResponse.statusText}`;
          } else {
            const teamInfo = await teamInfoResponse.json();

            if (!teamInfo.ok) {
              slackError = `Slack API error: ${teamInfo.error || "Unknown error"}`;
            } else {
              // Fetch users list
              const usersResponse = await fetch("https://slack.com/api/users.list", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${slackToken}`,
                  "Content-Type": "application/json",
                },
              });

              if (!usersResponse.ok) {
                slackError = `Failed to fetch Slack users: ${usersResponse.statusText}`;
              } else {
                const usersData = await usersResponse.json();

                if (!usersData.ok) {
                  slackError = `Slack API error: ${usersData.error || "Unknown error"}`;
                } else {
                  // Filter out deleted and bot users, get active members
                  const activeUsers = (usersData.members || []).filter(
                    (user: any) => !user.deleted && !user.is_bot && !user.is_restricted
                  );

                  slackData = {
                    team: {
                      id: teamInfo.team_id,
                      name: teamInfo.team,
                      url: teamInfo.url,
                    },
                    user: {
                      id: teamInfo.user_id,
                      name: teamInfo.user,
                    },
                    users: activeUsers,
                    totalUsers: activeUsers.length,
                  };
                }
              }
            }
          }
        } catch (apiErr) {
          try {
            slackError = `Failed to fetch Slack data: ${JSON.stringify(apiErr)}`;
          } catch {
            slackError = `Failed to fetch Slack data: ${String(apiErr)}`;
          }
        }
      }
    } catch (err) {
      try {
        slackError = `Failed to fetch Slack token: ${JSON.stringify(err)}`;
      } catch {
        slackError = `Failed to fetch Slack token: ${String(err)}`;
      }
    }
  }

  return (
    <>
      {role === "admin" ? (
        <Flex
          direction="column"
          width="900px"
          style={{
            height: "calc(100vh - 400px)",
            minHeight: "500px",
            position: "relative",
          }}
        >
          <Heading size="5" mb="4" color="gray" highContrast>
            Integrations
          </Heading>

          <Flex
            style={{
              position: "absolute",
              top: "60px",
              left: 0,
              right: 0,
              bottom: 0,
              border: "1px solid var(--gray-5)",
              borderRadius: "var(--radius-3)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "row",
            }}
          >
            <Tabs.Root
              defaultValue={activeTab}
              orientation="vertical"
              style={{
                display: "flex",
                width: "100%",
                height: "100%",
              }}
            >
              <Tabs.List
                style={{
                  width: "240px",
                  flexDirection: "column",
                  height: "100%",
                  padding: "0",
                  borderRight: "1px solid var(--gray-5)",
                  backgroundColor: "var(--gray-2)",
                  flexShrink: 0,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <Link
                  href="/integrations?tab=github-data-integration"
                  passHref
                  legacyBehavior
                >
                  <TabLink active={activeTab === "github-data-integration"}>
                    <GitHubLogoIcon />
                    <Text>Github Data Integration</Text>
                  </TabLink>
                </Link>
                <Link
                  href="/integrations?tab=google-calendar-integration"
                  passHref
                  legacyBehavior
                >
                  <TabLink active={activeTab === "google-calendar-integration"}>
                    <CalendarIcon />
                    <Text>Google Calendar Integration</Text>
                  </TabLink>
                </Link>
                <Link href="/integrations?tab=linear" passHref legacyBehavior>
                  <TabLink active={activeTab === "linear"}>
                    <RowsIcon />
                    <Text>Linear</Text>
                  </TabLink>
                </Link>
                <Link href="/integrations?tab=notion" passHref legacyBehavior>
                  <TabLink active={activeTab === "notion"}>
                    <FileTextIcon />
                    <Text>Notion</Text>
                  </TabLink>
                </Link>
                <Link href="/integrations?tab=slack" passHref legacyBehavior>
                  <TabLink active={activeTab === "slack"}>
                    <ChatBubbleIcon />
                    <Text>Slack</Text>
                  </TabLink>
                </Link>
                <Link href="/integrations?tab=dropbox" passHref legacyBehavior>
                  <TabLink active={activeTab === "dropbox"}>
                    <ArchiveIcon />
                    <Text>Dropbox</Text>
                  </TabLink>
                </Link>
              </Tabs.List>

    <Flex
      direction="column"
      style={{
        width: "calc(100% - 240px)",
        padding: "20px",
        backgroundColor: "var(--gray-1)",
        height: "100%",
        overflow: "auto",
      }}
    >
      {activeTab === "github-data-integration" && (
        <ContentSection title="Github Data Integration">
          <Flex direction="column" gap="3">
            {!githubUser && !githubError && (
              <Text size="3" color="gray">
                Loading GitHub profile…
              </Text>
            )}
            {githubError && (
              <Text size="3" color="orange">
                {githubError}
              </Text>
            )}
            {githubUser && <GithubProfileCard githubUser={githubUser} />}
          </Flex>
        </ContentSection>
      )}

      {activeTab === "google-calendar-integration" && (
        <ContentSection title="Google Calendar Integration">
          <Flex direction="column" gap="3">
            {googleCalendarError && (
              <Text size="3" color="orange">
                {googleCalendarError}
              </Text>
            )}
            {!googleCalendarError && !googleCalendarData && (
              <Text size="3" color="gray">
                No calendar data available.
              </Text>
            )}
            {!googleCalendarError && googleCalendarData && (
              <GoogleAgenda
                calendars={googleCalendarData.calendars}
                eventsByDay={googleCalendarData.eventsByDay}
              />
            )}
          </Flex>
        </ContentSection>
      )}
      {activeTab === "linear" && (
        <ContentSection title="Linear">
          <Flex direction="column" gap="3">
            <Text size="3" color="gray">
              Placeholder. Linear integration coming soon.
            </Text>
          </Flex>
        </ContentSection>
      )}
      {activeTab === "notion" && (
        <ContentSection title="Notion">
          <Flex direction="column" gap="3">
            <Text size="3" color="gray">
              Placeholder. Notion integration coming soon.
            </Text>
          </Flex>
        </ContentSection>
      )}
      {activeTab === "slack" && (
        <ContentSection title="Slack">
          <Flex direction="column" gap="3">
            {!slackData && !slackError && (
              <Text size="3" color="gray">
                Loading Slack data…
              </Text>
            )}
            {slackError && (
              <Text size="3" color="orange">
                {slackError}
              </Text>
            )}
            {slackData && <SlackDataCard slackData={slackData} />}
          </Flex>
        </ContentSection>
      )}
      {activeTab === "dropbox" && (
        <ContentSection title="Dropbox">
          <Flex direction="column" gap="3">
            {!dropboxData && !dropboxError && (
              <Text size="3" color="gray">
                Loading Dropbox data…
              </Text>
            )}
            {dropboxError && (
              <Text size="3" color="orange">
                {dropboxError}
              </Text>
            )}
            {dropboxData && <DropboxDataCard dropboxData={dropboxData} />}
          </Flex>
        </ContentSection>
      )}
        </Flex>
      </Tabs.Root>
          </Flex >
        </Flex >
      ) : (
      <Flex direction="column" gap="2" mb="4">
        <Heading size="8" align="center" color="gray" highContrast>
          Integrations
        </Heading>
        <Text size="5" align="left" color="gray">
          {role !== "admin"
            ? "Only Admin users can access this page."
            : "Organization ID is required for this page."}
        </Text>
      </Flex>
    )
  }
    </>
  );
}

function TabLink({
  active,
  children,
  ...props
}: {
  active: boolean;
  children: React.ReactNode;
  [key: string]: any;
}) {
  return (
    <a
      {...props}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "12px 16px",
        borderRadius: "0",
        borderBottom: "1px solid var(--gray-4)",
        width: "100%",
        backgroundColor: active ? "var(--accent-3)" : "transparent",
        color: active ? "var(--accent-11)" : "inherit",
        textDecoration: "none",
        cursor: "var(--cursor-button, pointer)",
      }}
    >
      <Flex gap="2" align="center">
        {children}
      </Flex>
    </a>
  );
}

function ContentSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Flex direction="column" gap="4">
      <Heading size="4" color="gray" highContrast>
        {title}
      </Heading>
      {children}
    </Flex>
  );
}

function GithubProfileCard({ githubUser }: { githubUser: any }) {
  // Accent-based palette function copied from Logs page
  const supportedHues = [
    "blue",
    "indigo",
    "violet",
    "purple",
    "plum",
    "pink",
    "crimson",
    "tomato",
    "orange",
    "amber",
    "yellow",
    "grass",
    "green",
    "teal",
    "cyan",
    "sky",
    "mint",
    "bronze",
    "gold",
    "brown",
    "gray",
  ];
  const envAccent = (process.env.ACCENT_COLOR || "").toLowerCase();
  const accentHue = supportedHues.includes(envAccent) ? envAccent : "indigo";
  const getAccentPalette = (hue: string): string[] => {
    switch (hue) {
      case "blue":
        return [
          "var(--blue-9)",
          "var(--indigo-9)",
          "var(--sky-9)",
          "var(--cyan-9)",
          "var(--violet-9)",
          "var(--teal-9)",
          "var(--grass-9)",
          "var(--amber-9)",
        ];
      case "teal":
        return [
          "var(--teal-9)",
          "var(--cyan-9)",
          "var(--mint-9)",
          "var(--grass-9)",
          "var(--blue-9)",
          "var(--indigo-9)",
          "var(--violet-9)",
          "var(--amber-9)",
        ];
      case "purple":
      case "plum":
      case "violet":
        return [
          "var(--violet-9)",
          "var(--purple-9)",
          "var(--plum-9)",
          "var(--indigo-9)",
          "var(--pink-9)",
          "var(--crimson-9)",
          "var(--blue-9)",
          "var(--teal-9)",
        ];
      case "crimson":
      case "tomato":
      case "pink":
        return [
          "var(--crimson-9)",
          "var(--tomato-9)",
          "var(--pink-9)",
          "var(--orange-9)",
          "var(--amber-9)",
          "var(--yellow-9)",
          "var(--plum-9)",
          "var(--violet-9)",
        ];
      case "orange":
      case "amber":
      case "yellow":
        return [
          "var(--orange-9)",
          "var(--amber-9)",
          "var(--yellow-9)",
          "var(--tomato-9)",
          "var(--crimson-9)",
          "var(--grass-9)",
          "var(--teal-9)",
          "var(--indigo-9)",
        ];
      case "grass":
      case "green":
        return [
          "var(--grass-9)",
          "var(--green-9)",
          "var(--teal-9)",
          "var(--mint-9)",
          "var(--cyan-9)",
          "var(--blue-9)",
          "var(--indigo-9)",
          "var(--amber-9)",
        ];
      case "bronze":
      case "gold":
      case "brown":
        return [
          "var(--bronze-9)",
          "var(--gold-9)",
          "var(--brown-9)",
          "var(--orange-9)",
          "var(--amber-9)",
          "var(--yellow-9)",
          "var(--plum-9)",
          "var(--violet-9)",
        ];
      case "gray":
        return [
          "var(--gray-9)",
          "var(--slate-9)",
          "var(--sage-9)",
          "var(--olive-9)",
          "var(--sand-9)",
          "var(--blue-9)",
          "var(--violet-9)",
          "var(--teal-9)",
        ];
      default:
        return [
          "var(--indigo-9)",
          "var(--violet-9)",
          "var(--purple-9)",
          "var(--plum-9)",
          "var(--pink-9)",
          "var(--blue-9)",
          "var(--teal-9)",
          "var(--amber-9)",
        ];
    }
  };
  const accentPalette = getAccentPalette(accentHue);
  const getLangColor = (lang: string): string => {
    if (!lang) return "var(--gray-8)";
    let hash = 0;
    for (let i = 0; i < lang.length; i++) {
      hash = (hash + lang.charCodeAt(i)) % 997;
    }
    return accentPalette[hash % accentPalette.length];
  };

  return (
    <Flex direction="column" gap="4">
      <div
        style={{
          padding: 16,
          borderRadius: "var(--radius-3)",
          border: "1px solid var(--gray-5)",
          background: "linear-gradient(135deg, var(--accent-3), white)",
        }}
      >
        <Flex gap="3" align="center">
          <img
            src={githubUser.user.avatar_url}
            alt={githubUser.user.login}
            width={80}
            height={80}
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              border: "1px solid var(--gray-6)",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 4px 10px rgba(0,0,0,0.06)",
              backgroundColor: "var(--gray-1)",
            }}
          />
          <Flex direction="column">
            <Text size="5" weight="bold">
              {githubUser.user.name || githubUser.user.login}
            </Text>
            <Text size="3" color="gray">@{githubUser.user.login}</Text>
          </Flex>
        </Flex>
      </div>

      {githubUser.languageCounts &&
        Object.keys(githubUser.languageCounts).length > 0 && (
          <Flex direction="column" gap="2">
            <Text size="3" weight="bold">Language Breakdown (public repos)</Text>
            {(() => {
              const entries = Object.entries(
                githubUser.languageCounts as Record<string, number>
              ) as [string, number][];
              const sorted = [...entries].sort((a, b) => b[1] - a[1]);
              const total = sorted.reduce((sum, [, c]) => sum + c, 0) || 1;
              return (
                <>
                  <div
                    style={{
                      width: "100%",
                      height: "14px",
                      borderRadius: "999px",
                      overflow: "hidden",
                      border: "1px solid var(--gray-5)",
                      backgroundColor: "var(--gray-3)",
                      display: "flex",
                    }}
                  >
                    {sorted.map(([lang, count]) => {
                      const pct = Math.max(0.5, (count / total) * 100);
                      const color = getLangColor(lang);
                      return (
                        <div
                          key={lang}
                          title={`${lang}: ${Math.round((count / total) * 100)}%`}
                          style={{
                            width: `${pct}%`,
                            backgroundColor: color,
                            height: "100%",
                          }}
                        />
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </Flex>
        )}

      {Array.isArray(githubUser.publicOrgs) &&
        githubUser.publicOrgs.length > 0 && (
          <Flex direction="column" gap="2">
            <Text size="3" weight="bold">Public Organizations</Text>
            <Flex gap="2" style={{ flexWrap: "wrap" }}>
              {githubUser.publicOrgs.map((org: any) => (
                <Flex
                  key={org.id}
                  align="center"
                  gap="2"
                  style={{
                    border: "1px solid var(--gray-5)",
                    borderRadius: "999px",
                    padding: "4px 8px",
                    backgroundColor: "var(--gray-2)",
                  }}
                >
                  {org.avatar_url && (
                    <img
                      src={org.avatar_url}
                      alt={org.login}
                      width={16}
                      height={16}
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        border: "1px solid var(--gray-5)",
                      }}
                    />
                  )}
                  <Text size="2">{org.login}</Text>
                </Flex>
              ))}
            </Flex>
          </Flex>
        )}

      {Array.isArray(githubUser.topRepos) && githubUser.topRepos.length > 0 && (
        <Flex direction="column" gap="2">
          <Text size="3" weight="bold">Top Public Repos</Text>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 12,
            }}
          >
            {githubUser.topRepos.map((r: any) => {
              const langColor = r.language ? getLangColor(r.language) : "var(--gray-8)";
              return (
                <div
                  key={r.id}
                  style={{
                    border: "1px solid var(--gray-5)",
                    borderRadius: "var(--radius-3)",
                    padding: 12,
                    backgroundColor: "var(--gray-1)",
                    boxShadow: "0 1px 1px rgba(0,0,0,0.02), 0 2px 8px rgba(0,0,0,0.04)",
                  }}
                >
                  <a
                    href={r.html_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ textDecoration: "none" }}
                  >
                    <Text size="3" weight="bold">{r.full_name}</Text>
                  </a>
                  {r.description && (
                    <Text size="2" color="gray" style={{ marginTop: 4, display: "block" }}>
                      {r.description}
                    </Text>
                  )}
                  <Flex gap="3" align="center" style={{ marginTop: 8 }}>
                    {r.language && (
                      <Flex align="center" gap="1">
                        <span
                          style={{
                            display: "inline-block",
                            width: "10px",
                            height: "10px",
                            borderRadius: "50%",
                            backgroundColor: langColor,
                            border: "1px solid var(--gray-6)",
                          }}
                        />
                        <Text size="2" color="gray">{r.language}</Text>
                      </Flex>
                    )}
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "999px",
                        backgroundColor: "var(--gray-3)",
                        border: "1px solid var(--gray-5)",
                        fontSize: 12,
                        color: "var(--gray-11)",
                      }}
                    >
                      ★ {r.stargazers_count}
                    </span>
                  </Flex>
                </div>
              );
            })}
          </div>
        </Flex>
      )}
    </Flex>
  );
}

function SlackDataCard({ slackData }: { slackData: any }) {
  return (
    <Flex direction="column" gap="4">
      {/* Team Info */}
      <div
        style={{
          padding: 16,
          borderRadius: "var(--radius-3)",
          border: "1px solid var(--gray-5)",
          background: "linear-gradient(135deg, var(--accent-3), white)",
        }}
      >
        <Flex gap="3" align="center">
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: "var(--radius-3)",
              backgroundColor: "var(--purple-9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid var(--gray-6)",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 4px 10px rgba(0,0,0,0.06)",
            }}
          >
            <ChatBubbleIcon width={30} height={30} color="white" />
          </div>
          <Flex direction="column">
            <Text size="5" weight="bold">
              {slackData.team.name}
            </Text>
            <Text size="3" color="gray">
              {slackData.totalUsers} member{slackData.totalUsers !== 1 ? "s" : ""}
            </Text>
            {slackData.team.url && (
              <a
                href={slackData.team.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: 12,
                  color: "var(--accent-11)",
                  textDecoration: "none",
                  marginTop: 4,
                }}
              >
                Open in Slack →
              </a>
            )}
          </Flex>
        </Flex>
      </div>

      {/* Users List */}
      {slackData.users && slackData.users.length > 0 && (
        <Flex direction="column" gap="3">
          <Text size="4" weight="bold">Team Members</Text>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 12,
            }}
          >
            {slackData.users.map((member: any) => (
              <div
                key={member.id}
                style={{
                  border: "1px solid var(--gray-5)",
                  borderRadius: "var(--radius-3)",
                  padding: 12,
                  backgroundColor: "var(--gray-1)",
                  boxShadow: "0 1px 1px rgba(0,0,0,0.02), 0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
                <Flex gap="3" align="center">
                  {member.profile?.image_72 ? (
                    <img
                      src={member.profile.image_72}
                      alt={member.real_name || member.name}
                      width={48}
                      height={48}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        border: "1px solid var(--gray-5)",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        backgroundColor: "var(--gray-4)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px solid var(--gray-5)",
                      }}
                    >
                      <Text size="3" weight="bold" color="gray">
                        {(member.real_name || member.name || "?")[0].toUpperCase()}
                      </Text>
                    </div>
                  )}
                  <Flex direction="column" style={{ flex: 1, minWidth: 0 }}>
                    <Text size="3" weight="medium" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {member.real_name || member.name || "Unknown"}
                    </Text>
                    {member.profile?.display_name && member.profile.display_name !== member.real_name && (
                      <Text size="2" color="gray" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        @{member.profile.display_name}
                      </Text>
                    )}
                    {member.profile?.title && (
                      <Text size="1" color="gray" style={{ marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {member.profile.title}
                      </Text>
                    )}
                    {member.is_admin && (
                      <span
                        style={{
                          display: "inline-block",
                          marginTop: 4,
                          padding: "2px 6px",
                          borderRadius: "999px",
                          backgroundColor: "var(--purple-3)",
                          color: "var(--purple-11)",
                          fontSize: 10,
                          fontWeight: 600,
                          width: "fit-content",
                        }}
                      >
                        Admin
                      </span>
                    )}
                  </Flex>
                </Flex>
              </div>
            ))}
          </div>
        </Flex>
      )}

      {(!slackData.users || slackData.users.length === 0) && (
        <Text size="3" color="gray">
          No team members found.
        </Text>
      )}
    </Flex>
  );
}

function DropboxDataCard({ dropboxData }: { dropboxData: any }) {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType === "folder") return "📁";
    return "📄";
  };

  const { account, space, files } = dropboxData;

  return (
    <Flex direction="column" gap="4">
      {/* Account Info */}
      <div
        style={{
          padding: 16,
          borderRadius: "var(--radius-3)",
          border: "1px solid var(--gray-5)",
          background: "linear-gradient(135deg, var(--accent-3), white)",
        }}
      >
        <Flex gap="3" align="center">
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: "var(--radius-3)",
              backgroundColor: "var(--blue-9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid var(--gray-6)",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 4px 10px rgba(0,0,0,0.06)",
            }}
          >
            <ArchiveIcon width={30} height={30} color="white" />
          </div>
          <Flex direction="column">
            <Text size="5" weight="bold">
              {account.name?.display_name || account.email}
            </Text>
            {account.email && (
              <Text size="3" color="gray">
                {account.email}
              </Text>
            )}
            {account.account_type && (
              <Text size="2" color="gray" style={{ marginTop: 4 }}>
                Account Type: {account.account_type[".tag"]}
              </Text>
            )}
          </Flex>
        </Flex>
      </div>

      {/* Storage Info */}
      {space && (
        <Flex direction="column" gap="2">
          <Text size="4" weight="bold">Storage</Text>
          <div
            style={{
              padding: 16,
              borderRadius: "var(--radius-3)",
              border: "1px solid var(--gray-5)",
              backgroundColor: "var(--gray-1)",
              boxShadow: "0 1px 1px rgba(0,0,0,0.02), 0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <Flex direction="column" gap="3">
              <Flex gap="3">
                <div style={{ flex: 1 }}>
                  <Text size="2" color="gray" weight="medium">
                    Used
                  </Text>
                  <Text size="5" weight="bold">
                    {formatBytes(space.used)}
                  </Text>
                </div>
                {space.allocation && space.allocation[".tag"] === "individual" && (
                  <div style={{ flex: 1 }}>
                    <Text size="2" color="gray" weight="medium">
                      Allocated
                    </Text>
                    <Text size="5" weight="bold">
                      {formatBytes(space.allocation.allocated)}
                    </Text>
                  </div>
                )}
              </Flex>
              {space.allocation && space.allocation[".tag"] === "individual" && (
                <>
                  <div
                    style={{
                      width: "100%",
                      height: "12px",
                      borderRadius: "999px",
                      overflow: "hidden",
                      border: "1px solid var(--gray-5)",
                      backgroundColor: "var(--gray-3)",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min((space.used / space.allocation.allocated) * 100, 100)}%`,
                        height: "100%",
                        backgroundColor: "var(--blue-9)",
                      }}
                    />
                  </div>
                  <Text size="2" color="gray">
                    {Math.round((space.used / space.allocation.allocated) * 100)}% of storage used
                  </Text>
                </>
              )}
            </Flex>
          </div>
        </Flex>
      )}

      {/* Files and Folders */}
      {files && files.length > 0 && (
        <Flex direction="column" gap="3">
          <Text size="4" weight="bold">Files & Folders</Text>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 12,
            }}
          >
            {files.map((file: any) => (
              <div
                key={file.id}
                style={{
                  border: "1px solid var(--gray-5)",
                  borderRadius: "var(--radius-3)",
                  padding: 12,
                  backgroundColor: "var(--gray-1)",
                  boxShadow: "0 1px 1px rgba(0,0,0,0.02), 0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
                <Flex gap="3" align="start">
                  <span style={{ fontSize: 32 }}>
                    {getFileIcon(file[".tag"])}
                  </span>
                  <Flex direction="column" style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      size="3"
                      weight="medium"
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {file.name}
                    </Text>
                    <Text size="2" color="gray">
                      {file[".tag"] === "folder" ? "Folder" : "File"}
                    </Text>
                    {file.size && (
                      <Text size="2" color="gray">
                        {formatBytes(file.size)}
                      </Text>
                    )}
                    {file.client_modified && (
                      <Text size="1" color="gray" style={{ marginTop: 4 }}>
                        Modified: {new Date(file.client_modified).toLocaleDateString()}
                      </Text>
                    )}
                  </Flex>
                </Flex>
              </div>
            ))}
          </div>
        </Flex>
      )}

      {(!files || files.length === 0) && (
        <Text size="3" color="gray">
          No files or folders found.
        </Text>
      )}
    </Flex>
  );
}


