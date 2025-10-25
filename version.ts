/**
 * Build version tracking to confirm fresh bundle is running
 * This file is generated at build time and helps debug "old bundle" issues
 */

export const APP_VERSION = '1.0.0-beta.1';
export const BUILD_TIMESTAMP = new Date().toISOString();
export const BUILD_ID = `${APP_VERSION}+${Date.now()}`;

/**
 * Log version info on app start
 * Call this in App.tsx useEffect to confirm code is fresh
 */
export const logVersionInfo = () => {
  console.log('='.repeat(60));
  console.log('🚀 LUMINA APP STARTING');
  console.log('='.repeat(60));
  console.log(`📦 Version: ${APP_VERSION}`);
  console.log(`🏗️  Build: ${BUILD_ID}`);
  console.log(`⏰ Built: ${BUILD_TIMESTAMP}`);
  console.log(`🌍 User Agent: ${navigator.userAgent}`);
  console.log(`📱 Platform: ${navigator.platform}`);
  console.log('='.repeat(60));
};
