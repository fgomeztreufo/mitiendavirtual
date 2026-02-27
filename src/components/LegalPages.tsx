import React from 'react';

// Layout base para todas las páginas legales/soporte
const LegalDashboardLayout = ({ title, children, onClose }: { title: string, children: React.ReactNode, onClose: () => void }) => (
  <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-8 animate-in fade-in duration-500">
    <button 
      onClick={onClose} 
      className="mb-6 text-xs text-blue-500 font-bold hover:text-blue-400 transition-colors uppercase tracking-widest"
    >
      ← Volver al Panel Principal
    </button>
    <h1 className="text-2xl font-bold text-white mb-6 border-b border-gray-800 pb-4">{title}</h1>
    <div className="space-y-4 text-gray-300 text-sm leading-relaxed">
      {children}
    </div>
  </div>
);

// --- VISTA DE SOPORTE PROFESIONAL ---
export const SupportPage = ({ onClose }: { onClose: () => void }) => (
  <LegalDashboardLayout title="Centro de Soporte y Ayuda" onClose={onClose}>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
      <div className="bg-gray-800/40 p-6 rounded-xl border border-gray-700 hover:border-blue-500 transition-all">
        <h3 className="text-white font-bold text-lg mb-2">Soporte vía Email</h3>
        <p className="text-gray-400 text-xs mb-4">Respuesta técnica garantizada en menos de 24 horas.</p>
        <a href="mailto:contacto@mitiendavirtual.cl" className="text-blue-400 font-medium hover:underline">contacto@mitiendavirtual.cl</a>
      </div>
      <div className="bg-gray-800/40 p-6 rounded-xl border border-gray-700 hover:border-green-500 transition-all">
        <h3 className="text-white font-bold text-lg mb-2">WhatsApp Prioritario</h3>
        <p className="text-gray-400 text-xs mb-4">Atención exclusiva para planes Pro y Full.</p>
        <a href="https://wa.me/56954080571" target="_blank" className="text-green-400 font-medium hover:underline">Chat de Asistencia</a>
      </div>
    </div>
  </LegalDashboardLayout>
);

// --- TÉRMINOS Y CONDICIONES ---
export const TermsOfService = ({ onClose }: { onClose: () => void }) => (
  <LegalDashboardLayout title="Términos y Condiciones" onClose={onClose}>
    <p>Operado por <strong>Felipe Gomez Treufo</strong> en Los Castaños 1088, Puente Alto.</p>
    <h3 className="text-white font-bold mt-4">Planes y Precios (CLP):</h3>
    <ul className="list-disc pl-5 space-y-1">
      <li><strong>Plan Free:</strong> $0 - 10 productos.</li>
      <li><strong>Plan Basic:</strong> $14.990 - 50 productos.</li>
      <li><strong>Plan Pro:</strong> $39.990 - 500 productos.</li>
      <li><strong>Plan Full:</strong> $59.990 - 2.000 productos e IA Ilimitada.</li>
    </ul>
  </LegalDashboardLayout>
);

// --- PRIVACIDAD ---
export const PrivacyPolicy = ({ onClose }: { onClose: () => void }) => (
  <LegalDashboardLayout title="Política de Privacidad" onClose={onClose}>
    <p>Cumplimos con la Ley 19.628. Responsable legal: <strong>Felipe Gomez Treufo</strong>.</p>
    <p>Dirección legal: Los Castaños 1088, Puente Alto, Chile.</p>
  </LegalDashboardLayout>
);

// --- ELIMINACIÓN DE DATOS (REQUISITO META) ---
export const DataDeletion = ({ onClose }: { onClose: () => void }) => (
  <LegalDashboardLayout title="Eliminación de Datos" onClose={onClose}>
    <p>Para eliminar su cuenta y datos de Meta, escriba a <strong>contacto@mitiendavirtual.cl</strong>.</p>
  </LegalDashboardLayout>
);