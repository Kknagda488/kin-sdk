import Kin, { show, hide, shutdown, update, startConversation, startMeeting, startTour, onShow, onHide } from './api';
import './globals.css';

// Explicitly expose to window to bypass bundler quirks
if (typeof window !== 'undefined') {
  const kinGlobal = Object.assign(Kin, {
    show,
    hide,
    shutdown,
    update,
    startConversation,
    startMeeting,
    startTour,
    onShow,
    onHide
  });
  (window as any).Kin = kinGlobal;

  // The website install snippet sets kinSettings before loading this script.
  // Auto-initialize so customers only need the one copy-paste snippet.
  const config = (window as any).kinSettings;
  if (config && typeof config.app_id === 'string' && config.app_id.trim()) {
    kinGlobal({
      organization_id: config.app_id,
      endpoint: config.endpoint,
      hide_default_launcher: Boolean(config.hide_default_launcher),
      bottom_tabs: Array.isArray(config.bottom_tabs) ? config.bottom_tabs : undefined,
      user_id: config.user_id,
      name: config.name,
      email: config.email,
    });
  }
}

// Ensure style is loaded automatically when using the CDN
if (typeof window !== 'undefined') {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  // Attempt to find the script tag that loaded this file to infer the base URL for the CSS
  const scripts = document.getElementsByTagName('script');
  let scriptUrl = '';
  for (let i = 0; i < scripts.length; i++) {
    if (scripts[i].src && (scripts[i].src.includes('cdn/cdn.global.js') || scripts[i].src.endsWith('/kin.js'))) {
      scriptUrl = scripts[i].src;
      break;
    }
  }
  
  // If we found it, load the CSS from the same directory
  if (scriptUrl) {
    const cssUrl = scriptUrl.includes('cdn.global.js')
      ? scriptUrl.replace('cdn.global.js', 'style.css')
      : scriptUrl.replace(/\/kin\.js(?:\?.*)?$/, '/style.css');
    link.href = cssUrl;
    document.head.appendChild(link);
  }
}
