# UI delta: Directory Sync (Events API)

Summary of what changed in the UI for the Directory Sync / Events API feature.

---

## 1. Navigation (header)

**File:** `src/app/components/Navigation.tsx`

**Change:** One new nav item after "Logs".

| Before | After |
|--------|--------|
| Home · Integrations · Settings · Logs · [Org Switcher] | Home · Integrations · Settings · Logs · **Directory Sync** · [Org Switcher] |

**Code added (lines 51–53):**
```tsx
<Button asChild variant="soft">
  <NextLink href="/directory-sync">Directory Sync</NextLink>
</Button>
```

---

## 2. New page: `/directory-sync`

**File:** `src/app/directory-sync/page.tsx` (new)

**Layout (admin, with org):**

```
┌─────────────────────────────────────────────────────────────┐
│  Directory Sync                                              │
├─────────────────────────────────────────────────────────────┤
│  Connection status                                           │
│  [Green] Directory Sync is connected for this organization.  │
│  (or gray copy if not connected)                            │
│  [Configure SCIM / Manage SCIM]  ← PortalButton (card)       │
├─────────────────────────────────────────────────────────────┤
│  DSync events                                                │
│  User and group lifecycle events (created, updated, …)        │
│                                                              │
│  WorkOS Events API · Auto-refresh every 10s · Last 7 days  N events
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ [Badge] user created    Jane Doe        2/10/2025, …    │ │
│  │ [Badge] group updated   Engineering     2/10/2025, …   │ │
│  │ [Badge] user deleted    john@co.com     2/9/2025, …     │ │
│  │ …                                                       │ │
│  └─────────────────────────────────────────────────────────┘ │
│           [ Load more (Events API cursor) ]                  │
└─────────────────────────────────────────────────────────────┘
```

**Other states:**
- No org: heading + “You need to belong to an organization…”
- Non-admin: “Only admins can view Directory Sync…”

---

## 3. DSync events block (DsyncEventStream)

**File:** `src/app/components/DsyncEventStream.tsx` (new component)

**UI elements:**

| Element | Description |
|--------|-------------|
| **Subtitle** | `WorkOS Events API · Auto-refresh every 10s · Last 7 days` |
| **Count** | `N event(s)` on the right of the subtitle |
| **Scrollable list** | Max height 420px; each row: [Badge] summary text, timestamp |
| **Badge colors** | Green (created/activated), blue (updated/user_added), red (deleted/user_removed), orange (deactivated), gray (other) |
| **Empty state** | “No directory sync events yet. Connect a directory…” |
| **Load more** | Button at bottom: “Load more (Events API cursor)” when there is an `after` cursor; label becomes “Loading…” while fetching |

**New UI vs nothing before:** entire Directory Sync page and events block are new; no existing screens were modified except the nav.

---

## 4. Files touched (UI surface only)

| File | Change |
|------|--------|
| `src/app/components/Navigation.tsx` | +1 button: “Directory Sync” → `/directory-sync` |
| `src/app/directory-sync/page.tsx` | **New** – page layout, connection status, PortalButton, DsyncEventStream |
| `src/app/components/DsyncEventStream.tsx` | **New** – event list, Events API subtitle, load-more button |

No other UI files were changed (e.g. Home, Integrations, Settings, Logs, layout, footer are unchanged).
