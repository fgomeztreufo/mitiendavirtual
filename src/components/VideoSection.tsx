import React from 'react';

const VideoSection: React.FC = () => {
  return (
    <section id="tiendas" className="mt-20 py-10 bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Nuestras Tiendas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Video 1 */}
          <div className="aspect-w-16 aspect-h-9">
            <video controls className="w-full h-full">
              <source src="/images/6649434-sd_506_960_25fps.mp4" type="video/mp4" />
              Tu navegador no soporta el elemento de video.
            </video>
          </div>
          {/* Video 2 */}
          <div className="aspect-w-16 aspect-h-9">
            <video controls className="w-full h-full">
              <source src="/videos/tienda2.mp4" type="video/mp4" />
              Tu navegador no soporta el elemento de video.
            </video>
          </div>
          {/* Video 3 */}
          <div className="aspect-w-16 aspect-h-9">
            <video controls className="w-full h-full">
              <source src="/videos/tienda3.mp4" type="video/mp4" />
              Tu navegador no soporta el elemento de video.
            </video>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VideoSection;
