// embedText: loads .env.local for the scripts, then shares the app's embedTexts (src/lib/policyLibrary.ts).
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

export { embedTexts } from "../src/lib/policyLibrary";
