const GITHUB_REPO = 'Griplock-Labs/MobileApp';
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

export interface UpdateInfo {
  hasUpdate: boolean;
  latestVersion: string | null;
  downloadUrl: string | null;
  releaseNotes: string | null;
  publishedAt: string | null;
}

function parseVersion(version: string): number[] {
  const cleaned = version.replace(/^v\.?/, '');
  return cleaned.split('.').map(n => parseInt(n, 10) || 0);
}

function isNewerVersion(latest: string, current: string): boolean {
  const latestParts = parseVersion(latest);
  const currentParts = parseVersion(current);
  
  for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
    const l = latestParts[i] || 0;
    const c = currentParts[i] || 0;
    if (l > c) return true;
    if (l < c) return false;
  }
  return false;
}

export async function checkForUpdates(currentVersion: string): Promise<UpdateInfo> {
  try {
    const response = await fetch(GITHUB_API_URL, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      console.log('[UpdateChecker] GitHub API error:', response.status);
      return { hasUpdate: false, latestVersion: null, downloadUrl: null, releaseNotes: null, publishedAt: null };
    }

    const data = await response.json();
    const latestVersion = data.tag_name || data.name;
    
    const apkAsset = data.assets?.find((asset: any) => 
      asset.name.endsWith('.apk') && !asset.name.endsWith('.zip')
    );
    
    const hasUpdate = isNewerVersion(latestVersion, currentVersion);
    
    console.log('[UpdateChecker] Current:', currentVersion, 'Latest:', latestVersion, 'Update:', hasUpdate);
    
    return {
      hasUpdate,
      latestVersion,
      downloadUrl: apkAsset?.browser_download_url || data.html_url,
      releaseNotes: data.body || null,
      publishedAt: data.published_at || null,
    };
  } catch (error) {
    console.error('[UpdateChecker] Error:', error);
    return { hasUpdate: false, latestVersion: null, downloadUrl: null, releaseNotes: null, publishedAt: null };
  }
}
