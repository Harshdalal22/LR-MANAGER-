
import React, { useEffect } from 'react';

const AdBanner: React.FC = () => {
  useEffect(() => {
    // Add a small delay to ensure the container has rendered and has width before pushing the ad
    const timer = setTimeout(() => {
        try {
            ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        } catch (e) {
            console.error("AdSense Error: ", e);
        }
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex justify-center my-8 p-4 bg-white rounded-lg shadow-md border border-gray-100">
      <ins 
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', minWidth: '250px', height: '90px' }}
        data-ad-client="ca-app-pub-2742543836663851"
        data-ad-slot="6671115476"
        data-ad-format="auto"
        data-full-width-responsive="true"
      ></ins>
    </div>
  );
};

export default AdBanner;
