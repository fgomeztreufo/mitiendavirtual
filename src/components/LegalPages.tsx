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
// --- TÉRMINOS Y CONDICIONES ACTUALIZADO ---
export const TermsOfService = ({ onClose }: { onClose: () => void }) => (
  <LegalDashboardLayout title="Términos y Condiciones" onClose={onClose}>
    <p>Operado por <strong>Felipe Gomez Treufo</strong> en Los Castaños 1088, Puente Alto, Chile.</p>
    
    <h3 className="text-white font-bold mt-6 mb-3 text-lg">Detalle de Planes y Límites (CLP):</h3>
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-gray-800 text-gray-400">
            <th className="py-2">Plan</th>
            <th className="py-2">Precio</th>
            <th className="py-2">Productos</th>
            <th className="py-2">Mensajes DM (IA)</th>
          </tr>
        </thead>
        <tbody className="text-gray-300">
          <tr className="border-b border-gray-800/50">
            <td className="py-3 font-bold text-blue-400">Free</td>
            <td className="py-3">$0</td>
            <td className="py-3">10</td>
            <td className="py-3">50 mensuales [cite: 2026-02-21]</td>
          </tr>
          <tr className="border-b border-gray-800/50">
            <td className="py-3 font-bold text-blue-400">Basic</td>
            <td className="py-3">$14.990</td>
            <td className="py-3">50</td>
            <td className="py-3">500 mensuales [cite: 2026-02-21]</td>
          </tr>
          <tr className="border-b border-gray-800/50">
            <td className="py-3 font-bold text-blue-400">Pro</td>
            <td className="py-3">$39.990</td>
            <td className="py-3">500</td>
            <td className="py-3">2.000 mensuales [cite: 2026-02-21]</td>
          </tr>
          <tr>
            <td className="py-3 font-bold text-blue-400">Full</td>
            <td className="py-3">$59.990</td>
            <td className="py-3">2.000</td>
            <td className="py-3">Ilimitados* [cite: 2026-02-21]</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <p className="text-[10px] text-gray-500 mt-4">
      * Los mensajes ilimitados del Plan Full están sujetos a nuestra <strong>Política de Uso Justo (Fair Use)</strong> para evitar abusos del sistema.
    </p>

    <h3 className="text-white font-bold mt-6 mb-2">Responsabilidad del Servicio</h3>
    <p>
      mitiendavirtual.cl no se responsabiliza por suspensiones de cuentas de Meta derivadas del uso inadecuado de la herramienta o violación de las políticas de Instagram por parte del usuario.
    </p>
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