# UI changes (user-facing)

What’s new or different in the app from a user’s point of view.

---

## New: Directory Sync

### In the header
- **New link:** **Directory Sync** appears in the top navigation (after Logs, before the org switcher).
- **Where:** Same row as Home, Integrations, Settings, Logs.
- **Action:** Clicking it goes to the Directory Sync page.

### On the Directory Sync page

**If you’re not in an org**
- You see: “Directory Sync” and “You need to belong to an organization to view directory sync.”

**If you’re in an org but not an admin**
- You see: “Only admins can view Directory Sync. Switch to an admin role or ask your org admin to enable Directory Sync.”

**If you’re an admin in an org**

1. **Connection status (top card)**
   - **Connected:** Green text “Directory Sync is connected for this organization.” and how many active directories; plus a **Manage SCIM** card you can click to open the Admin Portal.
   - **Not connected:** Gray text “No directory connected yet…” and a **Configure SCIM** card to open the Admin Portal.

2. **DSync events (below)**
   - Title: “DSync events” with short description about user/group lifecycle events.
   - **Subtitle:** “WorkOS Events API · Auto-refresh every 10s · Last 7 days” and an event count (e.g. “12 events”).
   - **List:** Scrollable list of events. Each row shows:
     - A colored badge (e.g. “user created”, “group updated”, “user deleted”).
     - A short summary (name, email, or “user ↔ group” for membership).
     - A timestamp.
   - **Empty state:** “No directory sync events yet. Connect a directory in the Admin Portal and make changes…”
   - **Load more:** When there are older events, a button **“Load more (Events API cursor)”** at the bottom (turns to “Loading…” while fetching).

**Behavior you’ll notice**
- The event list refreshes automatically every 10 seconds.
- “Load more” loads the next page of older events and appends them to the list.

---

## Unchanged (from the user’s perspective)

- **Home** – same.
- **Integrations** – same.
- **Settings** – same.
- **Logs** – same.
- **Org switcher** – same.
- **Sign in / session** – same.
- **Footer, layout, theme** – same.

---

## One-sentence summary

**Users now see a new “Directory Sync” link in the nav; admins get a dedicated page with connection status, an Admin Portal (SCIM) entry point, and a live-updating list of Directory Sync events with a “Load more” option.**
