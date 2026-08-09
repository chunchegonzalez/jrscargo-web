'use client';

import { MapPin, ExternalLink } from 'lucide-react';

export default function LocationMap() {
  const mapUrl = "https://maps.google.com/maps?q=2W23%2B2P4%2C+Heredia%2C+San+Pablo&t=&z=16&ie=UTF8&iwloc=&output=embed";

  return (
    <section className="section-padding bg-white relative">
      <div className="container-max">
        <div className="text-center mb-12">
          <h2 className="section-title">Encuéntranos</h2>
          <p className="section-subtitle">
            Ubicados estratégicamente en Heredia para facilitar el procesamiento de tus envíos.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-card border border-gray-100 max-w-5xl mx-auto flex flex-col lg:flex-row gap-6 items-center">
          
          <div className="w-full lg:w-1/3 flex flex-col justify-center items-center lg:items-start text-center lg:text-left p-4">
            <div className="w-16 h-16 bg-brand-bg-light rounded-full flex items-center justify-center text-brand-blue mb-6">
              <MapPin size={32} />
            </div>
            <h3 className="text-2xl font-black text-brand-blue mb-2">Sede Central</h3>
            <p className="text-brand-text-gray mb-8 text-balance leading-relaxed">
              2W23+2P4, Heredia, San Pablo<br />
              Urb. Nueva Jerusalén
            </p>
            
            <a 
              href="https://www.google.com/maps/place/JRS+CARGO+CR/@9.9999918,-84.0962979,253m/data=!3m2!1e3!4b1!4m6!3m5!1s0x8fa0e50070b2b9c3:0x57e9993aae41eab2!8m2!3d9.9999905!4d-84.0956542!16s%2Fg%2F11zd7mddck?entry=ttu&g_ep=EgoyMDI2MDgwNS4xIKXMDSoASAFQAw%3D%3D"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline w-full sm:w-auto flex items-center justify-center gap-2"
            >
              Abrir en Google Maps
              <ExternalLink size={18} />
            </a>
          </div>

          <div className="w-full lg:w-2/3 h-[350px] lg:h-[450px] rounded-2xl overflow-hidden relative">
            <iframe 
              src={mapUrl}
              width="100%" 
              height="100%" 
              style={{ border: 0 }} 
              allowFullScreen={true} 
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade"
              className="absolute inset-0 grayscale-[20%] contrast-[1.1]"
              title="Ubicación JRS CARGO en Heredia"
            ></iframe>
          </div>
          
        </div>
      </div>
    </section>
  );
}
