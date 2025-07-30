import React, { useEffect } from 'react';
import { siteConfig } from '../config/siteConfig';

const GoogleAnalytics: React.FC = () => {
  useEffect(() => {
    // Only load Google Analytics if we have a valid ID
    if (siteConfig.analytics.googleAnalyticsId && siteConfig.analytics.googleAnalyticsId !== 'G-XXXXXXXXXX') {
      // Create script tag for Google tag (gtag.js)
      const script1 = document.createElement('script');
      script1.async = true;
      script1.src = `https://www.googletagmanager.com/gtag/js?id=${siteConfig.analytics.googleAnalyticsId}`;
      document.head.appendChild(script1);

      // Create script tag for initialization
      const script2 = document.createElement('script');
      script2.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${siteConfig.analytics.googleAnalyticsId}');
      `;
      document.head.appendChild(script2);

      return () => {
        // Cleanup scripts on component unmount
        document.head.removeChild(script1);
        document.head.removeChild(script2);
      };
    }
  }, []);

  return null; // This component doesn't render anything
};

export default GoogleAnalytics;