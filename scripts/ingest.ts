import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
const pdfParse = require("pdf-parse");
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { embedTexts } from "./embedText";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; 

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing required environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function processDocument(filePath: string) {
  const fileName = path.basename(filePath);
  console.log(`\nProcessing: ${fileName}`);

  let text = "";
  if (filePath.endsWith(".pdf")) {
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    text = pdfData.text;
  } else if (filePath.endsWith(".md") || filePath.endsWith(".txt")) {
    text = fs.readFileSync(filePath, "utf-8");
  } else {
    console.log(`Unsupported file type: ${fileName}`);
    return;
  }

  // 2. Chunk the text
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
  });
  const chunks = await splitter.createDocuments([text]);
  console.log(`Created ${chunks.length} chunks from ${fileName}.`);

  // 3. Process in batches to avoid rate limits
  const batchSize = 10;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    console.log(`Processing batch ${i / batchSize + 1} of ${Math.ceil(chunks.length / batchSize)}...`);

    // 4. Search data from embed-text (Cloudflare)
    const embeddings = await embedTexts(batch.map((c) => c.pageContent));

    // 5. Prepare rows for Supabase
    const rows = batch.map((chunk, index) => ({
      document_id: fileName,
      content: chunk.pageContent,
      metadata: chunk.metadata,
      embedding: embeddings[index],
    }));

    // 6. Insert into Supabase
    const { error } = await supabase.from("document_chunks").insert(rows);
    if (error) {
      console.error("Error inserting batch:", error.message);
    } else {
        // Wait 2 seconds between batches to respect free tier rate limits
        await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  console.log(`✅ Finished processing ${fileName}!`);
}

async function main() {
  const manualsDir = path.join(process.cwd(), "manuals");
  if (!fs.existsSync(manualsDir)) {
    fs.mkdirSync(manualsDir);
    console.log("Created 'manuals' directory. Please place files there and re-run.");
    return;
  }

  const files = fs.readdirSync(manualsDir).filter(f => f.endsWith(".pdf") || f.endsWith(".md") || f.endsWith(".txt"));
  
  if (files.length === 0) {
    console.log("No valid files found in 'manuals' directory.");
    return;
  }

  for (const file of files) {
    await processDocument(path.join(manualsDir, file));
  }
}

main().catch(console.error);