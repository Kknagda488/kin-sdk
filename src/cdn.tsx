import Kin, { show, hide, shutdown, update, startConversation, startMeeting, onShow, onHide } from './api';
import './globals.css';

// Explicitly expose to window to bypass bundler quirks
if (typeof window !== 'undefined') {
  (window as any).Kin = Object.assign(Kin, {
    show,
    hide,
    shutdown,
    update,
    startConversation,
    startMeeting,
    onShow,
    onHide
  });
}

// Ensure style is loaded automatically when using the CDN
if (typeof window !== 'undefined') {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  // Attempt to find the script tag that loaded this file to infer the base URL for the CSS
  const scripts = document.getElementsByTagName('script');
  let scriptUrl = '';
  for (let i = 0; i < scripts.length; i++) {
    if (scripts[i].src && scripts[i].src.includes('cdn/cdn.global.js')) {
      scriptUrl = scripts[i].src;
      break;
    }
  }
  
  // If we found it, load the CSS from the same directory
  if (scriptUrl) {
    const cssUrl = scriptUrl.replace('cdn.global.js', 'cdn.css');
    link.href = cssUrl;
    document.head.appendChild(link);
  }
}
