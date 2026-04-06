/**
 * Parse a VTT transcript file into readable text.
 * Reuses the same logic as zoom.ts parseVttTranscript but works with raw file content.
 */
export function parseVttContent(vttContent: string): string {
  const lines = vttContent.split('\n');
  const output: string[] = [];
  let currentSpeaker = '';
  let currentTimestamp = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Match timestamp lines like "00:00:01.234 --> 00:00:05.678"
    const timestampMatch = line.match(/^(\d{2}):(\d{2}):(\d{2})\.\d+ -->/);
    if (timestampMatch) {
      const hours = parseInt(timestampMatch[1]);
      const minutes = parseInt(timestampMatch[2]);
      const seconds = parseInt(timestampMatch[3]);
      const totalMinutes = hours * 60 + minutes;
      currentTimestamp = `${totalMinutes}:${seconds.toString().padStart(2, '0')}`;
      continue;
    }

    // Match speaker lines like "Speaker Name: text"
    const speakerMatch = line.match(/^(.+?):\s*(.+)$/);
    if (speakerMatch && currentTimestamp) {
      currentSpeaker = speakerMatch[1];
      output.push(`[${currentTimestamp}] ${currentSpeaker}: ${speakerMatch[2]}`);
      currentTimestamp = '';
    } else if (line && !line.startsWith('WEBVTT') && !line.match(/^\d+$/) && currentTimestamp) {
      if (currentSpeaker) {
        output.push(`[${currentTimestamp}] ${currentSpeaker}: ${line}`);
      } else {
        output.push(`[${currentTimestamp}] ${line}`);
      }
      currentTimestamp = '';
    }
  }

  return output.join('\n');
}

/**
 * Strip the file extension from a filename to use as a title.
 */
export function titleFromFilename(filename: string): string {
  return filename.replace(/\.(vtt|txt)$/i, '');
}

export function isVttFile(filename: string): boolean {
  return /\.vtt$/i.test(filename);
}
