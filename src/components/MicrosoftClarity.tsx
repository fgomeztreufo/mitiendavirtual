import { useEffect } from 'react'
import { siteConfig } from '../config/siteConfig'

export default function MicrosoftClarity() {
  useEffect(() => {
    const id = siteConfig.analytics.microsoftClarityId
    if (!id || id === 'XXXXXXXXXX') return

    const script = document.createElement('script')
    script.innerHTML = `
      (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window,document,"clarity","script","${id}");
    `
    document.head.appendChild(script)

    return () => { document.head.removeChild(script) }
  }, [])

  return null
}
