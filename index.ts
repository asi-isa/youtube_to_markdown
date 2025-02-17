#!/usr/bin/env ts-node

import * as fs from "fs";
import * as path from "path";
import * as process from "process";
import * as dotenv from "dotenv";
import { YoutubeTranscript } from "youtube-transcript";
import OpenAI from "openai";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { fetch } from "undici";

// Load environment variables from .env (if present)
dotenv.config();

interface VideoInfo {
  videoId: string;
  title: string;
  url: string;
}

interface YouTubeApiResponse {
  items: {
    id: {
      kind: string;
      videoId: string;
    };
    snippet: {
      title: string;
    };
  }[];
}

/**
 * Extract channel ID from a YouTube channel URL
 */
async function getChannelId(channelUrl: string): Promise<string> {
  try {
    // Handle @username format
    const usernameMatch = channelUrl.match(/@([^/]+)/);
    if (usernameMatch) {
      const username = usernameMatch[1];
      const response = await fetch(`https://www.youtube.com/@${username}`, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      });
      const html = await response.text();
      const match = html.match(/"channelId":"([^"]+)"|browseId":"([^"]+)"/);
      if (!match) throw new Error("Could not find channel ID");
      return match[1] || match[2];
    }

    // Handle direct channel URLs
    const channelMatch = channelUrl.match(/channel\/([^/]+)/);
    if (channelMatch) return channelMatch[1];

    throw new Error("Invalid channel URL format");
  } catch (error) {
    throw new Error(`Failed to get channel ID: ${(error as Error).message}`);
  }
}

/**
 * Fetch recent videos from a YouTube channel
 */
async function getChannelVideos(
  channelUrl: string,
  limit: number
): Promise<VideoInfo[]> {
  try {
    const channelId = await getChannelId(channelUrl);
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      throw new Error("YOUTUBE_API_KEY not found in environment variables");
    }

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&part=snippet,id&order=date&maxResults=${limit}`
    );

    const data = (await response.json()) as YouTubeApiResponse;

    return data.items
      .filter((item) => item.id.kind === "youtube#video")
      .map((item) => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      }));
  } catch (error) {
    throw new Error(
      `Failed to fetch channel videos: ${(error as Error).message}`
    );
  }
}

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
 * Process a single video
 */
async function processVideo(
  video: VideoInfo,
  openaiApiKey: string
): Promise<void> {
  try {
    console.log(`Processing video: ${video.title}`);

    // Create the main transcripts directory if it doesn't exist
    const transcriptsDir = "transcripts";
    if (!fs.existsSync(transcriptsDir)) {
      fs.mkdirSync(transcriptsDir, { recursive: true });
    }

    // Create a directory for the video if it doesn't exist
    const videoDir = path.join(transcriptsDir, video.videoId);
    if (!fs.existsSync(videoDir)) {
      fs.mkdirSync(videoDir, { recursive: true });
    }

    // Generate filenames
    const sanitizedTitle = video.title
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "_");
    const rawFilename = path.join(videoDir, `transcript_${video.videoId}.txt`);
    const mdFilename = path.join(
      videoDir,
      `${sanitizedTitle}_${video.videoId}.md`
    );

    // Check if files already exist
    if (fs.existsSync(rawFilename) && fs.existsSync(mdFilename)) {
      console.log(`Skipping ${video.title} - transcript already exists`);
      return;
    }

    // Fetch and process the transcript
    const rawTranscript = await fetchYoutubeTranscript(video.videoId);
    fs.writeFileSync(rawFilename, rawTranscript, { encoding: "utf-8" });
    console.log(`Raw transcript saved to ${rawFilename}`);

    // Enhance with AI
    console.log("Enhancing transcript with AI...");
    const enhancedMarkdown = await enhanceTranscriptWithAI(
      rawTranscript,
      openaiApiKey
    );
    fs.writeFileSync(mdFilename, enhancedMarkdown, { encoding: "utf-8" });
    console.log(`Enhanced blog article saved to ${mdFilename}`);
  } catch (error) {
    console.error(
      `Error processing video ${video.title}: ${(error as Error).message}`
    );
  }
}

/**
 * Main program entry point
 */
async function main(): Promise<void> {
  const argv = await yargs(hideBin(process.argv))
    .option("url", {
      alias: "u",
      type: "string",
      description: "YouTube video or channel URL",
    })
    .option("n", {
      type: "number",
      description: "Number of recent videos to process (for channel URLs)",
      default: 5,
    })
    .demandOption("url")
    .help().argv;

  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    console.error("Error: OPENAI_API_KEY not found in environment variables!");
    process.exit(1);
  }

  try {
    // Check if URL is a video or channel
    if (argv.url.includes("/watch?v=") || argv.url.includes("youtu.be/")) {
      // Process single video
      const videoId = extractYoutubeVideoId(argv.url);
      await processVideo(
        {
          videoId,
          title: `Video_${videoId}`, // We'll get actual title from transcript
          url: argv.url,
        },
        openaiApiKey
      );
    } else {
      // Process channel
      console.log(`Fetching ${argv.n} recent videos from channel...`);
      const videos = await getChannelVideos(argv.url, argv.n);
      console.log(`Found ${videos.length} videos. Processing...`);
      for (const video of videos) {
        await processVideo(video, openaiApiKey);
      }
    }

    console.log("Processing complete!");
  } catch (error) {
    console.error("An error occurred:", error);
    process.exit(1);
  }
}

// Run the main function
main().catch((err) => {
  console.error("An error occurred:", err);
  process.exit(1);
});
