import React from 'react';

// --- LAYOUT BASE (MODO OVERLAY) ---
const LegalLayout = ({ title, subtitle, children, onClose }: { title: string, subtitle: string, children: React.ReactNode, onClose: () => void }) => (
  <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col overflow-y-auto animate-in fade-in duration-300 font-sans">
    <div className="max-w-4xl mx-auto w-full p-6 md:p-20 flex-grow">
      
      {/* Cabecera con Botón de Cierre Funcional */}
      <div className="flex items-center justify-between mb-12 border-b border-white/10 pb-8">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight uppercase">{title}</h1>
          <p className="text-blue-500 font-mono text-xs mt-2 tracking-[0.3em] uppercase">{subtitle}</p>
        </div>
        <button 
          onClick={onClose} // <--- ESTO ES LO QUE HACE QUE EL BOTÓN FUNCIONE
          className="group flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-gray-400 hover:text-white hover:bg-red-500/20 hover:border-red-500/50 transition-all uppercase tracking-widest shadow-2xl active:scale-95"
        >
          <span>Cerrar</span>
          <svg className="w-5 h-5 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Contenido Profesional */}
      <div className="bg-[#0A0B10] border border-white/5 rounded-3xl p-8 md:p-12 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <div className="space-y-10 text-gray-400 text-[16px] leading-relaxed font-light">
          {children}
        </div>
      </div>

      <div className="mt-12 text-center">
        <p className="text-[10px] text-gray-700 uppercase tracking-[0.5em]">
          Documentación Oficial • MiTiendaVirtual • 2026
        </p>
      </div>
    </div>
  </div>
);

// --- VISTA: ELIMINACIÓN DE DATOS (REQUISITO META) ---
export const DataDeletion = ({ onClose }: { onClose: () => void }) => (
  <LegalLayout title="Eliminación" subtitle="Protocolo de Datos de Usuario" onClose={onClose}>
    <div className="bg-red-600/5 border border-red-500/20 p-8 rounded-2xl text-center">
      <h3 className="text-white font-bold text-xl mb-4 text-red-500">Solicitud de Borrado Definitivo</h3>
      <p className="text-gray-400 mb-8 max-w-lg mx-auto">
        De acuerdo con las políticas de Meta, usted puede solicitar la eliminación de sus datos y de negocio de nuestros servidores.
      </p>
      <div className="inline-block bg-gray-950 px-8 py-6 rounded-2xl border border-gray-800 shadow-inner">
        <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Enviar correo con asunto "BORRAR DATOS" a:</p>
        <p className="text-xl font-mono text-white select-all border-b border-blue-500/30 pb-1">contacto@mitiendavirtual.cl</p>
      </div>
      <div className="mt-8 space-y-2 text-left text-sm text-gray-500 max-w-md mx-auto italic">
        <p>• El proceso elimina: Perfil, Catálogos, Mensajes IA e integraciones de Meta.</p>
        <p>• Plazo de ejecución: Máximo 48 horas hábiles.</p>
      </div>
    </div>
  </LegalLayout>
);

// --- VISTA: TÉRMINOS ---
export const TermsOfService = ({ onClose }: { onClose: () => void }) => (
  <LegalLayout title="Términos" subtitle="Contrato de Servicio" onClose={onClose}>
    <section className="space-y-4">
      <h3 className="text-white font-bold text-xl">Planes y Tarifas</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {n:'Free', p:'$0'}, {n:'Basic', p:'$14.990'}, {n:'Pro', p:'$39.990'}, {n:'Full', p:'$59.990'}
        ].map(i => (
          <div key={i.n} className="bg-white/5 p-4 rounded-xl border border-white/5 text-center">
            <p className="text-blue-400 font-bold">{i.n}</p>
            <p className="text-white text-lg">{i.p}</p>
          </div>
        ))}
      </div>
    </section>
    <p>Operado por <strong>Felipe Alonso Gomez Treufo</strong> en Los Castaños 1088, Puente Alto, Chile.</p>
  </LegalLayout>
);

// --- VISTA: PRIVACIDAD ---
export const PrivacyPolicy = ({ onClose }: { onClose: () => void }) => (
  <LegalLayout title="Privacidad" subtitle="Protección de Datos" onClose={onClose}>
    <p>Cumplimos con la <strong>Ley 19.628</strong> sobre Protección de la Vida Privada.</p>
    <p>Titular Responsable: Felipe Gomez Treufo • contacto@mitiendavirtual.cl</p>
  </LegalLayout>
);

// --- VISTA: SOPORTE ---
export const SupportPage = ({ onClose }: { onClose: () => void }) => (
  <LegalLayout title="Soporte" subtitle="Asistencia Técnica" onClose={onClose}>
    <div className="flex flex-col md:flex-row gap-6">
      <a href="mailto:contacto@mitiendavirtual.cl" className="flex-1 p-8 bg-blue-600/10 border border-blue-500/20 rounded-2xl text-center hover:bg-blue-600/20 transition-all">
        <h4 className="text-white font-bold text-xl">Email</h4>
        <p className="text-blue-400 mt-2">contacto@mitiendavirtual.cl</p>
      </a>
      <a href="https://wa.me/56954080571" target="_blank" className="flex-1 p-8 bg-emerald-600/10 border border-emerald-500/20 rounded-2xl text-center hover:bg-emerald-600/20 transition-all">
        <h4 className="text-white font-bold text-xl">WhatsApp</h4>
        <p className="text-emerald-400 mt-2">+56 9 5408 0571</p>
      </a>
    </div>
  </LegalLayout>
);