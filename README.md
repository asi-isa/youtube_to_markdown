# YouTube to Markdown

A Node.js tool that converts YouTube videos and channel content into markdown blog posts using AI enhancement.

## Features

- Process individual YouTube videos or entire channels
- Extract video transcripts automatically
- Generate AI-enhanced blog posts in markdown format
- Skip already processed videos
- Support for multiple video URLs in a single command

## Prerequisites

- Node.js (v18 or higher)
- YouTube API Key
- OpenAI API Key

## Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd youtube_to_markdown
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```plaintext
   OPENAI_API_KEY=your_openai_api_key
   YOUTUBE_API_KEY=your_youtube_api_key
   ```

## How to Use

### Process Individual Videos

To process one or more YouTube videos:

```bash
npm start -- --urls "https://youtube.com/watch?v=VIDEO_ID1" "https://youtube.com/watch?v=VIDEO_ID2"
```

### Process Channel Videos

To process recent videos from a YouTube channel:

```bash
npm start -- --channel https://youtube.com/channel/CHANNEL_ID --n 5
```

The `-n` parameter specifies how many recent videos to process (default: 5)

## Output Structure

The tool creates a directory structure under `transcripts/`:

```plaintext
├── VIDEO_ID1/
│ ├── transcript_VIDEO_ID1.txt
│ └── Blog_Title_VIDEO_ID1.md
└── VIDEO_ID2/
├── transcript_VIDEO_ID2.txt
└── Blog_Title_VIDEO_ID2.md
```

Each video gets its own subdirectory with:

- `transcript_VIDEO_ID.txt`: Raw transcript text
- `Blog_Title_VIDEO_ID.md`: Enhanced blog post in Markdown format

## Notes

- The tool will skip videos that have already been processed
- Each video gets its own directory with both raw transcript and enhanced markdown
- The AI enhancement uses GPT-4 to create well-structured blog posts
- YouTube API has quotas, so be mindful of how many videos you process at once

## License

ISC
