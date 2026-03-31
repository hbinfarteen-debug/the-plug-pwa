/**
 * Device Fingerprinting Utility
 * Generates a stable, unique identifier for the current device.
 * Combines multiple browser/hardware signals for reliability.
 * 100% client-side, no external APIs needed.
 */

// Simple hash function
const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
};

// Canvas fingerprint - unique per GPU/browser rendering engine
const getCanvasFingerprint = () => {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#00ff88';
    ctx.fillText('ThePlug🔌', 2, 2);
    ctx.fillStyle = '#7c3aed';
    ctx.fillRect(100, 1, 62, 20);
    return canvas.toDataURL().slice(-50);
  } catch (e) {
    return 'no-canvas';
  }
};

// WebGL fingerprint - unique per GPU
const getWebGLInfo = () => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return 'no-webgl';
    const renderer = gl.getParameter(gl.RENDERER);
    const vendor = gl.getParameter(gl.VENDOR);
    return `${vendor}::${renderer}`;
  } catch (e) {
    return 'no-webgl';
  }
};

/**
 * Main function: generates a unique device fingerprint
 * Returns a stable string ID for this device
 */
export const getDeviceFingerprint = () => {
  const signals = [
    navigator.userAgent,
    navigator.language,
    navigator.hardwareConcurrency || 0,
    navigator.maxTouchPoints || 0,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.platform || '',
    navigator.cookieEnabled,
    getCanvasFingerprint(),
    getWebGLInfo(),
    // Check for touch support
    ('ontouchstart' in window) ? 'touch' : 'mouse',
    // Screen orientation
    window.screen.orientation?.type || 'unknown',
  ].join('|');

  return 'dfp_' + hashString(signals);
};

/**
 * Get human-readable device info for the confirmation popup
 */
export const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  let device = 'Unknown Device';
  let browser = 'Unknown Browser';

  // Detect device type
  if (/iPhone/.test(ua)) device = 'iPhone';
  else if (/iPad/.test(ua)) device = 'iPad';
  else if (/Android.*Mobile/.test(ua)) device = 'Android Phone';
  else if (/Android/.test(ua)) device = 'Android Tablet';
  else if (/Windows/.test(ua)) device = 'Windows PC';
  else if (/Mac/.test(ua)) device = 'Mac';
  else if (/Linux/.test(ua)) device = 'Linux Device';

  // Detect browser
  if (/Chrome\//.test(ua) && !/Chromium|Edge/.test(ua)) browser = 'Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';
  else if (/Edge\//.test(ua)) browser = 'Edge';
  else if (/Opera/.test(ua)) browser = 'Opera';

  return { device, browser };
};
