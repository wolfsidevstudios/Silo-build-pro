import React from 'react';

export const PricingPage: React.FC = () => {

  const showCheckoutWindow = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    const url = e.currentTarget.getAttribute('data-url');
    if (!url) return;
    
    const title = 'Square Payment Links';

    // Some platforms embed in an iframe, so we want to top window to calculate sizes correctly
    const topWindow = window.top ? window.top : window;

    // Fixes dual-screen position                                Most browsers          Firefox
    const dualScreenLeft = topWindow.screenLeft !==  undefined ? topWindow.screenLeft : topWindow.screenX;
    const dualScreenTop = topWindow.screenTop !==  undefined   ? topWindow.screenTop  : topWindow.screenY;

    const width = topWindow.innerWidth ? topWindow.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
    const height = topWindow.innerHeight ? topWindow.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;

    const h = height * .75;
    const w = 500;

    const systemZoom = width / topWindow.screen.availWidth;
    const left = (width - w) / 2 / systemZoom + dualScreenLeft;
    const top = (height - h) / 2 / systemZoom + dualScreenTop;
    const newWindow = window.open(url, title, `scrollbars=yes, width=${w / systemZoom}, height=${h / systemZoom}, top=${top}, left=${left}`);

    if (newWindow && window.focus) newWindow.focus();
  }

  return (
    <div className="flex flex-col items-center justify-start min-h-full p-8 pt-20 text-center overflow-y-auto">
       <div className="bg-white/50 backdrop-blur-lg border border-gray-200 rounded-2xl p-12 shadow-xl max-w-2xl mb-12">
        <h1 className="text-5xl font-bold text-black mb-4">
          Completely Free.
        </h1>
        <p className="text-lg text-gray-700 mb-8">
          Silo Build is free to use for everyone. Just bring your own Gemini API key and start building without limits. You only pay for what you use on the underlying services.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#/settings"
            className="w-full sm:w-auto px-8 py-3 bg-black text-white rounded-full font-semibold hover:bg-zinc-800 transition-colors"
          >
            Add Your API Key
          </a>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-8 py-3 bg-transparent border-2 border-black text-black rounded-full font-semibold hover:bg-black hover:text-white transition-colors"
          >
            Get a Gemini Key
          </a>
        </div>
      </div>

       <div className="bg-white/50 backdrop-blur-lg border border-gray-200 rounded-2xl p-12 shadow-xl max-w-2xl mb-8">
            <h2 className="text-4xl font-bold text-black mb-4">
                Fund Our Service
            </h2>
            <p className="text-lg text-gray-700 mb-8">
                Enjoying Silo Build? Consider supporting our development to help us keep the servers running and add new features.
            </p>
            <div className="flex justify-center">
              <div style={{
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                alignItems: 'center',
                width: '259px',
                background: '#FFFFFF',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                boxShadow: '-2px 10px 5px rgba(0, 0, 0, 0)',
                borderRadius: '10px',
                fontFamily: 'Rubik, SQ Market, Helvetica, Arial, sans-serif',
              }}>
                <img src="https://items-images-production.s3.us-west-2.amazonaws.com/files/094a748df0fb3c55c17a30fbfa4aefee3aeeee8f/original.png" alt="Silo Pro" onError={(e) => (e.currentTarget.style.display = 'none')} style={{ width: '100%' }}/>
                <div style={{ padding: '20px' }}>
                  <p style={{
                    fontSize: '18px',
                    lineHeight: '20px',
                  }}>Silo Pro</p>
                  <p style={{
                    fontSize: '18px',
                    lineHeight: '20px',
                    fontWeight: 600,
                  }}>$5.00</p>
                  <a target="_blank" data-url="https://square.link/u/F5PsKdcA?src=embd" href="https://square.link/u/F5PsKdcA?src=embed" onClick={showCheckoutWindow} style={{
                    display: 'inline-block',
                    fontSize: '18px',
                    lineHeight: '48px',
                    height: '48px',
                    color: '#000000',
                    minWidth: '212px',
                    backgroundColor: '#d9d9d9',
                    textAlign: 'center',
                    boxShadow: '0 0 0 1px rgba(0,0,0,.1) inset',
                    borderRadius: '50px',
                    textDecoration: 'none'
                  }}>Pay now</a>
                </div>
              </div>
            </div>
        </div>
    </div>
  );
};