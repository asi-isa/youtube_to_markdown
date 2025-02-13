#!/usr/bin/env ts-node

import * as fs from "fs";
import * as path from "path";
import * as process from "process";
import * as dotenv from "dotenv";
import { YoutubeTranscript } from "youtube-transcript";
import OpenAI from "openai";

// Load environment variables from .env (if present)
dotenv.config();

/**
 * Extract the video ID from a YouTube URL.
 * This handles typical youtu.be and youtube.com/watch?v= formats.
 */
function extractYoutubeVideoId(url: string): string {
  let videoId: string | null = null;

  // Regex for typical patterns
  const pattern = /(?:v=|\/)([0-9A-Za-z_-]{11}).*/;
  const match = url.match(pattern);
  if (match) {
    videoId = match[1];
  } else {
    // In case of a short link like youtu.be/VIDEO_ID
    if (url.includes("youtu.be/")) {
      // The video ID is 11 characters after "youtu.be/"
      videoId = url.split("youtu.be/").pop()?.substring(0, 11) || null;
    }
  }

  if (!videoId) {
    throw new Error(`Could not parse video ID from URL: ${url}`);
  }

  return videoId;
}

/**
 * Fetch the transcript for a given YouTube video ID.
 * Returns the transcript as a single text string.
 */
async function fetchYoutubeTranscript(videoId: string): Promise<string> {
  try {
    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);

    const transcriptText = transcriptItems.map((item) => item.text).join(" ");

    return transcriptText;
  } catch (error) {
    throw new Error(`Error fetching transcript: ${(error as Error).message}`);
  }
}

/**
 * Send the transcript to an AI service (OpenAI in this example) and
 * ask it to create a blog article in Markdown.
 */
async function enhanceTranscriptWithAI(
  transcript: string,
  apiKey: string,
  model = "gpt-4o-mini"
): Promise<string> {
  try {
    const openai = new OpenAI({ apiKey });

    const prompt = `
You are a helpful blog-writing assistant. I will give you a raw YouTube transcript.

Please transform this transcript into a well-structured, engaging blog article in Markdown format. 
Include a short introduction, key points, headings, bullet points, and a conclusion.

Transcript:
${transcript}

Now, produce the final blog post in Markdown below:
    `.trim();

    const response = await openai.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const enhancedMarkdown = response.choices[0]?.message?.content ?? "";
    return enhancedMarkdown.trim();
  } catch (error) {
    throw new Error(`Error calling AI service: ${(error as Error).message}`);
  }
}

/**
 * Main program entry point
 */
async function main(): Promise<void> {
  // Check if a YouTube URL is passed as an argument
  if (process.argv.length < 3) {
    console.error("Usage: ts-node index.ts <youtube_url>");
    process.exit(1);
  }

  const youtubeUrl = process.argv[2];

  // Extract the video ID from the URL
  const videoId = extractYoutubeVideoId(youtubeUrl);

  console.log(`Fetching transcript for video ID: ${videoId}`);

  // Fetch the raw transcript
  const rawTranscript = await fetchYoutubeTranscript(videoId);

  // Create the main transcripts directory if it doesn't exist
  const transcriptsDir = "transcripts";
  if (!fs.existsSync(transcriptsDir)) {
    fs.mkdirSync(transcriptsDir, { recursive: true });
  }

  // Create a directory for the video if it doesn't exist
  const videoDir = path.join(transcriptsDir, videoId);
  if (!fs.existsSync(videoDir)) {
    fs.mkdirSync(videoDir, { recursive: true });
  }

  // Write raw transcript to a text file inside the video directory
  const rawFilename = path.join(videoDir, `transcript_${videoId}.txt`);
  fs.writeFileSync(rawFilename, rawTranscript, { encoding: "utf-8" });
  console.log(`Raw transcript saved to ${rawFilename}`);

  // Read the OPENAI_API_KEY from environment
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    console.error("Error: OPENAI_API_KEY not found in environment variables!");
    process.exit(1);
  }

  // Enhance the transcript with AI
  console.log(
    "Enhancing transcript with AI to create a blog article in Markdown..."
  );
  const enhancedMarkdown = await enhanceTranscriptWithAI(
    rawTranscript,
    openaiApiKey
  );

  // Extract a title from the resulting Markdown (looking for first-level heading)
  const titleMatch = enhancedMarkdown.match(/^# (.*?)$/m);
  const title = titleMatch ? titleMatch[1] : "blog_article";

  // Create sanitized filename from the title (remove special chars & spaces)
  const sanitizedTitle = title
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_");

  // Save the enhanced article in Markdown
  const mdFilename = path.join(videoDir, `${sanitizedTitle}_${videoId}.md`);

  // Remove markdown code fences (```markdown ... ```) if present
  const cleanedMarkdown = enhancedMarkdown
    .replace(/^```markdown\n/, "")
    .replace(/\n```$/, "");

  fs.writeFileSync(mdFilename, cleanedMarkdown, { encoding: "utf-8" });
  console.log(`Enhanced blog article saved to ${mdFilename}`);
}

// Run the main function, catch any unhandled errors
main().catch((err) => {
  console.error("An error occurred:", err);
  process.exit(1);
});
