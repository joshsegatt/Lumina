// src/hooks/useModelManager.ts

import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Http, HttpResponseType } from '@capacitor/http';
import { Directory, Filesystem } from '@capacitor/filesystem';

// Define the possible states for our model
export type ModelStatus = 'NOT_DOWNLOADED' | 'DOWNLOADING' | 'DOWNLOADED' | 'ERROR';

export function useModelManager(modelUrl: string, checksum?: string) {
  const [status, setStatus] = useState<ModelStatus>('NOT_DOWNLOADED');
  const [progress, setProgress] = useState(0);
  const [localPath, setLocalPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getFilename = (url: string) => url.substring(url.lastIndexOf('/') + 1);
  const filename = getFilename(modelUrl);

  // Function to calculate SHA256 checksum
  const verifyChecksum = async (data: Blob): Promise<boolean> => {
    if (!checksum) return true; // No checksum provided, skip validation
    try {
      const buffer = await data.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex === checksum;
    } catch (e) {
      console.error('Checksum validation failed:', e);
      return false;
    }
  };

  // Check for the cached file on component mount
  useEffect(() => {
    const checkForFile = async () => {
      try {
        const stat = await Filesystem.stat({
          path: filename,
          directory: Directory.Data, // Use internal app storage
        });
        setLocalPath(stat.uri);
        setStatus('DOWNLOADED');
      } catch (e) {
        // File does not exist, which is fine.
        setStatus('NOT_DOWNLOADED');
      }
    };
    if (Capacitor.isNativePlatform()) {
      checkForFile();
    }
  }, [filename]);

  const downloadModel = async () => {
    if (!Capacitor.isNativePlatform()) {
      // Fallback for web: open the URL in a new tab
      window.open(modelUrl, '_blank');
      return;
    }

    setStatus('DOWNLOADING');
    setProgress(0);
    setError(null);

    try {
      // Download the file
      const response = await Http.get({
        url: modelUrl,
        responseType: HttpResponseType.Blob,
        // Listen for progress events
        onDownloadProgress: (progress) => {
          setProgress(progress.loaded / progress.total);
        },
      });

      // Validate checksum before saving
      const isValid = await verifyChecksum(response.data);
      if (!isValid) {
        throw new Error('Checksum validation failed. The downloaded file may be corrupt.');
      }

      // Save the file to the device
      const result = await Filesystem.writeFile({
        path: filename,
        data: response.data,
        directory: Directory.Data, // Internal storage, managed by the OS
      });

      setLocalPath(result.uri);
      setStatus('DOWNLOADED');
      setProgress(1);

    } catch (e: any) {
      console.error('Model download failed:', e);
      setStatus('ERROR');
      setError(e.message || 'An unknown error occurred during download.');
      // Clean up partially downloaded file if it exists
      try {
        await Filesystem.deleteFile({ path: filename, directory: Directory.Data });
      } catch (deleteError) {
        // Ignore if file doesn't exist
      }
    }
  };

  return { status, progress, localPath, error, downloadModel };
}