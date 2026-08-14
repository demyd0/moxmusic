/**
 * Extracts an 11-character YouTube video id from any common URL shape
 * (youtube.com/watch?v=, youtu.be/, music.youtube.com/watch?v=,
 * youtube.com/embed/, youtube.com/shorts/). Returns null if the input
 * isn't a recognizable YouTube URL - used to validate the "profile track"
 * link before it's ever rendered as an embed.
 */
export function extractYoutubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.protocol !== 'https:') return null;

  const host = url.hostname.replace(/^www\./, '');
  const VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

  if (host === 'youtu.be') {
    const id = url.pathname.slice(1).split('/')[0];
    return VIDEO_ID_RE.test(id) ? id : null;
  }

  if (host === 'youtube.com' || host === 'music.youtube.com' || host === 'm.youtube.com') {
    const vParam = url.searchParams.get('v');
    if (vParam && VIDEO_ID_RE.test(vParam)) return vParam;

    const pathMatch = url.pathname.match(/^\/(embed|shorts)\/([a-zA-Z0-9_-]{11})/);
    if (pathMatch) return pathMatch[2];
  }

  return null;
}
