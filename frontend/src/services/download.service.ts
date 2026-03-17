/**
 * Download Service
 * Handles video and file downloads with proper error handling
 */

export class DownloadService {
  /**
   * Download a video from URL
   * @param url - Video URL to download
   * @param filename - Name for the downloaded file
   */
  static downloadVideo(url: string, filename: string): void {
    if (!url) {
      console.error('Download failed: No URL provided');
      return;
    }

    // Check if URL is a blob URL or data URL
    if (url.startsWith('blob:') || url.startsWith('data:')) {
      this._downloadBlob(url, filename);
    } else {
      // For regular URLs, use fetch to handle CORS and get proper blob
      this._downloadFromUrl(url, filename);
    }
  }

  /**
   * Download multiple videos
   * @param videos - Array of {url, filename}
   */
  static downloadMultiple(videos: Array<{ url: string; filename: string }>): void {
    videos.forEach(({ url, filename }) => {
      // Add small delay between downloads to avoid browser throttling
      setTimeout(() => {
        this.downloadVideo(url, filename);
      }, 100);
    });
  }

  /**
   * Download blob URL directly
   */
  private static _downloadBlob(blobUrl: string, filename: string): void {
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Download from URL using fetch
   */
  private static async _downloadFromUrl(url: string, filename: string): Promise<void> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      this._downloadBlob(blobUrl, filename);
      // Clean up blob URL after download
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    } catch (error) {
      console.error('Download error:', error);
      // Fallback to direct download attempt
      this._downloadBlob(url, filename);
    }
  }

  /**
   * Generate a timestamp for filename
   */
  static generateTimestamp(): string {
    const now = new Date();
    return now.toISOString().slice(0, 10) + '_' + now.toTimeString().slice(0, 8).replace(/:/g, '-');
  }

  /**
   * Generate filename with timestamp
   */
  static generateFilename(prefix: string, ext: string = '.mp4'): string {
    return `${prefix}_${this.generateTimestamp()}${ext}`;
  }
}
