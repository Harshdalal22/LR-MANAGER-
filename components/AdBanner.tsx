import React, { useEffect } from 'react';

const AdBanner: React.FC = () => {
  useEffect(() => {
    try {
      // Push ad to the array to display it
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch (e) {
      console.error("AdSense Error: ", e);
    }
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