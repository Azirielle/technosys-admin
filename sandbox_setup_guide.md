# Teammate Sandbox Setup Prompt

Copy the text block below and send it directly to your AI assistant:

```markdown
I am setting up the local developer sandbox testing ground for our TechnoSys HRIS project on my machine. Both repositories (`hris-admin` and `hris-mobile`) are cloned locally in my workspace.

Please help me configure and boot up our local sandbox environment so I can test all changes (including schedules, attendance logs, and ticket updates) before pushing them to production.

Perform the following tasks:
1. **Verify Workspace Folders**: Inspect our workspace for `hris-admin` (Next.js) and `hris-mobile` (Expo React Native).
2. **Environment Variables Config**:
   - Ensure `hris-admin/` has a valid `.env.local` referencing the shared database URL, anon key, and service role key.
   - Verify `hris-mobile/` Supabase configuration uses the correct env keys for staging connection.
3. **Boot Up Development Sandbox (Sword 1)**:
   - For `hris-admin`: Check package dependencies and prepare to launch the Next.js local server on `http://localhost:3000` via `npm run dev`.
   - For `hris-mobile`: Check dependencies and prepare to launch the Expo server via `npx expo start --web` (or equivalent npm scripts) to test the mobile UI inside my browser.
4. **Vercel Preview Deployments Check (Sword 2)**:
   - Verify that Vercel configuration files (e.g. `vercel.json` in mobile) are scoped correctly so pushing feature branches (e.g. `dev`) triggers Preview Deployments on Vercel without overriding production.
5. **Compilation Check**: Run type checking (`npx tsc --noEmit`) in both project folders to verify that the sandbox builds with 0 compiler errors.

Please inspect both folders, verify package.json scripts, make sure the local env keys are set, and guide me on running the dev servers to test.
```
