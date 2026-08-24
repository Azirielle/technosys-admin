<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:verification-rules -->
# Strict Validation and Logic Verification Rule
- Before completing any task, you must:
  1. Compile-check the workspace (e.g., `npx tsc --noEmit` or appropriate compiler command) to verify 0 compiler/linter errors.
  2. Run verification/test scripts to verify literal 0 logic errors, confirming that database interactions and application flows behave correctly under real inputs.
  3. Inspect stdout/stderr outputs directly rather than assuming success from task exit codes.
<!-- END:verification-rules -->

# Strict Biometrics Requirement
- DO NOT use the phone's native local biometrics (such as `expo-local-authentication` or any FaceID/Fingerprint scan of the mobile phone device itself) for clocking in or out.
- Employees DO clock in using the mobile app (without using phone biometrics like FaceID/Fingerprint). Clocking out is typically handled by admins via the admin portal.

