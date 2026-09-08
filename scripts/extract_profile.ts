import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("Please set GEMINI_API_KEY in .env.local");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const imagesDir = "C:\\Users\\ANDREW\\Downloads\\company profile";
const outputFile = "C:\\Users\\ANDREW\\Projects\\Master-TechnoSys-Folder\\Admin-side\\Company_Profile.md";

function fileToGenerativePart(filePath: string, mimeType: string) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
      mimeType
    },
  };
}

async function extractMissing() {
  const files = [
    "c37f9051-1d2e-4288-8ca6-6da719950dd5.jpg",
    "c515b24b-aff0-4049-857c-b6d460ace389.jpg",
    "cf66d72d-1a18-40b4-8318-71f0fab7e2da.jpg"
  ];
  
  let appendMarkdown = "";

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`Processing remaining image ${i + 1}/3: ${file}`);
    
    const imagePart = fileToGenerativePart(path.join(imagesDir, file), "image/jpeg");
    const prompt = "Extract all the text, information, and structure from this company profile page. Format it cleanly in Markdown. If there are tables, recreate them in Markdown. Do not include any conversational filler, just the extracted content.";
    
    let success = false;
    while (!success) {
      try {
        const result = await model.generateContent([prompt, imagePart]);
        const text = result.response.text();
        appendMarkdown += `## Page ${i + 25}\n\n${text}\n\n---\n\n`;
        success = true;
        await new Promise(r => setTimeout(r, 15000)); // wait 15 seconds to be absolutely safe
      } catch (e: any) {
        console.warn(`Rate limit. Waiting 60s...`);
        await new Promise(r => setTimeout(r, 60000));
      }
    }
  }

  fs.appendFileSync(outputFile, appendMarkdown);
  console.log(`Extraction complete! Appended to ${outputFile}`);
}

extractMissing();
