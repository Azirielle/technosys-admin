# Developer Guidelines & Commands

## CLI Commands
- Build project: `npm run build`
- Dev server: `npm run dev`
- Seed database: `node seed.js`
- Type checking: `npx tsc --noEmit`

## Strict Git Rules
- **NEVER** push changes directly to the `main` branch.
- **ALWAYS** create and switch to a new branch containing the user's name (e.g., `glorycode24/<feature-name>` or `glorycode24`) before committing and pushing.
- All remote integrations should be pushed to this feature branch, followed by creating a Pull Request (`gh pr create`).

## Jira Integration (Headless REST API Client)
To prevent Google SSO blocks and browser lock issues, **DO NOT use browser automation (Playwright/Puppeteer) to connect to Jira.** Instead, use the direct Node.js HTTPS REST API client located in the scratch directory:
- **Jira Client Script Path:** `C:\Users\ANDREW\antigravity\brain\4f6fcee2-dedd-40cd-9b07-4708cbf60373\scratch\jira-client.js`
- **Active Task Sync Script:** `C:\Users\ANDREW\antigravity\brain\4f6fcee2-dedd-40cd-9b07-4708cbf60373\scratch\run-jira-tasks.js`
- **Jira Host:** `andrewsadarayan.atlassian.net`
- **Jira Email:** `andrews.adarayan@gmail.com`
- **Project Key:** `KAN`
- **Jira API Token:** Refer to the hardcoded `JIRA_TOKEN` variable in the local script file `jira-client.js` (which is stored in the persistent scratch folder outside the git repository).
- **User Account ID (Andrew):** `712020:b005f52e-6a92-4376-ac57-754a7e2e2d03`

### CLI Usage Commands:
- **List issues:**
  `node C:\Users\ANDREW\antigravity\brain\4f6fcee2-dedd-40cd-9b07-4708cbf60373\scratch\jira-client.js list`
- **Create task:**
  `node C:\Users\ANDREW\antigravity\brain\4f6fcee2-dedd-40cd-9b07-4708cbf60373\scratch\jira-client.js create "Task Title" "Description"`
- **List available status transitions for a task:**
  `node C:\Users\ANDREW\antigravity\brain\4f6fcee2-dedd-40cd-9b07-4708cbf60373\scratch\jira-client.js transitions KAN-29`
- **Move task status (e.g. to "In Progress"):**
  `node C:\Users\ANDREW\antigravity\brain\4f6fcee2-dedd-40cd-9b07-4708cbf60373\scratch\jira-client.js move KAN-29 "In Progress"`
- **Synchronize and assign the 5 milestone backlog tasks:**
  `node C:\Users\ANDREW\antigravity\brain\4f6fcee2-dedd-40cd-9b07-4708cbf60373\scratch\run-jira-tasks.js`

@AGENTS.md
