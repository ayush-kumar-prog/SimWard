/**
 * Asset Preloader
 * Phase 7: Preload scenario assets (images, videos) before simulation starts
 */

import type { Scenario } from '../types';

export interface PreloadProgress {
  loaded: number;
  total: number;
  percentage: number;
  currentAsset: string;
}

export type PreloadProgressCallback = (progress: PreloadProgress) => void;

/**
 * Extract all asset paths from a scenario
 * @param scenario - Scenario object
 * @returns Array of asset URLs
 */
export function extractAssetPaths(scenario: Scenario): string[] {
  const assets: Set<string> = new Set();

  // Extract from nodes
  Object.values(scenario.nodes).forEach(node => {
    // Background scene
    if (node.scene) {
      assets.add(node.scene);
    }

    // Video if present
    if (node.video) {
      assets.add(node.video);
    }

    // Evidence images
    if (node.evidence) {
      node.evidence.forEach(evidence => assets.add(evidence));
    }
  });

  return Array.from(assets);
}

/**
 * Preload an image
 * @param url - Image URL
 * @returns Promise that resolves when image is loaded
 */
function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => resolve();
    img.onerror = () => {
      console.warn(`Failed to load image: ${url}`);
      // Resolve anyway to not block other assets
      resolve();
    };
    
    img.src = url;
  });
}

/**
 * Preload a video
 * @param url - Video URL
 * @returns Promise that resolves when video metadata is loaded
 */
function preloadVideo(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    
    video.onloadedmetadata = () => resolve();
    video.onerror = () => {
      console.warn(`Failed to load video: ${url}`);
      resolve();
    };
    
    video.src = url;
    video.preload = 'metadata';
  });
}

/**
 * Preload a single asset
 * @param url - Asset URL
 * @returns Promise that resolves when asset is loaded
 */
async function preloadAsset(url: string): Promise<void> {
  // Determine asset type from extension
  const ext = url.split('.').pop()?.toLowerCase();
  
  if (!ext) {
    console.warn(`Unable to determine file type for: ${url}`);
    return;
  }

  const videoExtensions = ['mp4', 'webm', 'ogg', 'mov'];
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];

  if (videoExtensions.includes(ext)) {
    return preloadVideo(url);
  } else if (imageExtensions.includes(ext)) {
    return preloadImage(url);
  } else {
    console.warn(`Unknown file type: ${url}`);
  }
}

/**
 * Preload all assets for a scenario
 * @param scenario - Scenario object
 * @param onProgress - Optional callback for progress updates
 * @returns Promise that resolves when all assets are loaded
 */
export async function preloadScenarioAssets(
  scenario: Scenario,
  onProgress?: PreloadProgressCallback
): Promise<void> {
  const assets = extractAssetPaths(scenario);
  
  if (assets.length === 0) {
    console.log('No assets to preload');
    return;
  }

  console.log(`Preloading ${assets.length} assets for scenario "${scenario.id}"`);

  let loaded = 0;

  for (const asset of assets) {
    try {
      await preloadAsset(asset);
      loaded++;

      if (onProgress) {
        onProgress({
          loaded,
          total: assets.length,
          percentage: Math.round((loaded / assets.length) * 100),
          currentAsset: asset,
        });
      }
    } catch (error) {
      console.error(`Error preloading asset ${asset}:`, error);
      loaded++;
    }
  }

  console.log(`✅ Preloaded ${loaded}/${assets.length} assets`);
}

/**
 * Preload assets with batching for better performance
 * @param scenario - Scenario object
 * @param onProgress - Optional callback for progress updates
 * @param batchSize - Number of assets to load in parallel (default: 5)
 * @returns Promise that resolves when all assets are loaded
 */
export async function preloadScenarioAssetsBatch(
  scenario: Scenario,
  onProgress?: PreloadProgressCallback,
  batchSize: number = 5
): Promise<void> {
  const assets = extractAssetPaths(scenario);
  
  if (assets.length === 0) {
    return;
  }

  console.log(`Preloading ${assets.length} assets in batches of ${batchSize}`);

  let loaded = 0;

  // Process assets in batches
  for (let i = 0; i < assets.length; i += batchSize) {
    const batch = assets.slice(i, i + batchSize);
    
    await Promise.all(
      batch.map(async (asset) => {
        try {
          await preloadAsset(asset);
        } catch (error) {
          console.error(`Error preloading asset ${asset}:`, error);
        } finally {
          loaded++;
          
          if (onProgress) {
            onProgress({
              loaded,
              total: assets.length,
              percentage: Math.round((loaded / assets.length) * 100),
              currentAsset: asset,
            });
          }
        }
      })
    );
  }

  console.log(`✅ Preloaded ${loaded}/${assets.length} assets`);
}

/**
 * Check if an asset exists
 * @param url - Asset URL
 * @returns Promise<boolean> - true if asset exists and is accessible
 */
export async function checkAssetExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Validate all assets in a scenario exist
 * @param scenario - Scenario object
 * @returns Promise with array of missing asset paths (empty if all exist)
 */
export async function validateScenarioAssets(scenario: Scenario): Promise<string[]> {
  const assets = extractAssetPaths(scenario);
  const missing: string[] = [];

  await Promise.all(
    assets.map(async (asset) => {
      const exists = await checkAssetExists(asset);
      if (!exists) {
        missing.push(asset);
      }
    })
  );

  return missing;
}

