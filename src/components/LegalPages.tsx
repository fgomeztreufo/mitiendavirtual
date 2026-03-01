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
          onClick={onClose}
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

      <div className="mt-12 text-center pb-12">
        <p className="text-[10px] text-gray-700 uppercase tracking-[0.5em]">
          Documentación Oficial • MiTiendaVirtual • 2026
        </p>
      </div>
    </div>
  </div>
);

// --- VISTA: TÉRMINOS DE SERVICIO (CON PLANES Y PROTECCIÓN LEGAL) ---
export const TermsOfService = ({ onClose }: { onClose: () => void }) => (
  <LegalLayout title="Términos" subtitle="Contrato de Servicio y Uso" onClose={onClose}>
    
    <section className="space-y-6">
      <h3 className="text-white font-bold text-xl border-l-4 border-blue-500 pl-4 uppercase tracking-tight">1. Estructura de Planes y Precios</h3>
      <p className="text-sm">
        El acceso a MiTiendaVirtual se rige por niveles de suscripción mensual. Los precios y capacidades vigentes para el año 2026 en Chile son:
      </p>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-inner">
        <table className="w-full text-left text-sm text-gray-300">
          <thead>
            <tr className="bg-white/10 text-[10px] uppercase tracking-widest text-blue-400">
              <th className="px-6 py-4">Nivel de Plan</th>
              <th className="px-6 py-4">Inversión Mensual</th>
              <th className="px-6 py-4">Catálogo</th>
              <th className="px-6 py-4">Mensajes AI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            <tr className="hover:bg-white/5 transition-colors text-xs">
              <td className="px-6 py-4 font-bold text-white uppercase">Free</td>
              <td className="px-6 py-4">$0 (Costo Cero)</td>
              <td className="px-6 py-4">Hasta 10 productos</td>
              <td className="px-6 py-4">50 mensajes</td>
            </tr>
            <tr className="hover:bg-white/5 transition-colors text-xs">
              <td className="px-6 py-4 font-bold text-white uppercase">Basic</td>
              <td className="px-6 py-4">$14.990 CLP</td>
              <td className="px-6 py-4">Hasta 50 productos</td>
              <td className="px-6 py-4">500 mensajes</td>
            </tr>
            <tr className="hover:bg-blue-500/5 transition-colors text-xs bg-blue-500/5">
              <td className="px-6 py-4 font-bold text-white uppercase">Pro</td>
              <td className="px-6 py-4">$39.990 CLP</td>
              <td className="px-6 py-4">Hasta 500 productos</td>
              <td className="px-6 py-4 font-bold text-blue-400 italic">2.000 mensajes</td>
            </tr>
            <tr className="hover:bg-white/5 transition-colors text-xs font-medium">
              <td className="px-6 py-4 font-bold text-white uppercase">Full</td>
              <td className="px-6 py-4">$59.990 CLP</td>
              <td className="px-6 py-4">Hasta 2.000 productos</td>
              <td className="px-6 py-4 text-emerald-400 uppercase tracking-tighter italic">Ilimitados*</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 p-5 rounded-2xl text-xs space-y-3">
        <p className="text-white font-bold uppercase">Aviso de Agotamiento de Cupo:</p>
        <p className="leading-relaxed">
          Si el usuario consume la totalidad de sus mensajes asignados antes del cierre de su ciclo mensual, el servicio pasará automáticamente al estado de <strong>Plan Free</strong>. Las funciones correspondientes al plan originalmente contratado se reactivarán únicamente tras el pago de un nuevo ciclo o la renovación automática del periodo.
        </p>
      </div>
    </section>

    <section className="space-y-6">
      <h3 className="text-white font-bold text-xl border-l-4 border-red-500 pl-4 uppercase tracking-tight">2. Blindaje Legal y Garantía de Software</h3>
      <div className="text-sm space-y-4">
        <p>
          El software MiTiendaVirtual se entrega bajo la modalidad de <strong>"As Is" (Tal Cual Es)</strong>. El Titular no se responsabiliza por:
        </p>
        <ul className="list-disc ml-6 space-y-2 text-gray-400 italic">
          <li>Errores técnicos imprevistos (bugs), caídas de servidores o fallos de conexión externa.</li>
          <li>Alteraciones en las APIs de Meta (Instagram/WhatsApp) que afecten la integración.</li>
          <li>Pérdidas económicas o de ventas derivadas del tiempo de respuesta del soporte técnico o mantenimientos programados.</li>
        </ul>
      </div>
    </section>

    <section className="space-y-6">
      <h3 className="text-white font-bold text-xl border-l-4 border-emerald-500 pl-4 uppercase tracking-tight">3. Política de Pagos y Devoluciones</h3>
      <div className="text-sm space-y-4 leading-relaxed">
        <p>
          <strong>Política de "No Reembolso":</strong> Dado que el servicio ofrece acceso inmediato a infraestructura digital y modelos de inteligencia artificial, MiTiendaVirtual <strong>no realiza devoluciones de dinero</strong> una vez procesado el pago mensual.
        </p>
        <p>
          Usted podrá cancelar su suscripción en cualquier momento para evitar futuros cobros, manteniendo el servicio activo hasta el último día del periodo ya pagado. El Plan Free es gratuito de por vida mientras el usuario no exceda los límites establecidos.
        </p>
      </div>
    </section>

    <footer className="pt-8 border-t border-white/5 mt-8 text-[11px] text-gray-600">
      Titular Responsable: FELIPE ALONSO GOMEZ TREUFO • RUT: 16.208.020-2 • Domicilio Comercial: Los Castaños 1088, Puente Alto, Santiago, Chile.
    </footer>
  </LegalLayout>
);

// --- VISTA: PRIVACIDAD (CUMPLIMIENTO LEY 19.628) ---
export const PrivacyPolicy = ({ onClose }: { onClose: () => void }) => (
  <LegalLayout title="Privacidad" subtitle="Protocolo de Protección de Datos" onClose={onClose}>
    <section className="space-y-6 text-sm">
      <p>MiTiendaVirtual garantiza el cumplimiento de la <strong>Ley 19.628</strong> sobre Protección de la Vida Privada en territorio chileno.</p>
      <ul className="space-y-4">
        <li className="flex gap-4">
          <span className="text-blue-500 font-bold">01.</span>
          <p>Los datos de catálogo y mensajería se utilizan exclusivamente para el entrenamiento y respuesta de su asistente IA personalizado.</p>
        </li>
        <li className="flex gap-4">
          <span className="text-blue-500 font-bold">02.</span>
          <p>No comercializamos bases de datos con terceros bajo ninguna circunstancia.</p>
        </li>
      </ul>
      <p className="pt-6 border-t border-white/5 italic text-gray-500">
        Para consultas sobre sus derechos ARCO (Acceso, Rectificación, Cancelación y Oposición), contacte a: contacto@mitiendavirtual.cl
      </p>
    </section>
  </LegalLayout>
);

// --- VISTA: ELIMINACIÓN DE DATOS (REQUISITO META) ---
export const DataDeletion = ({ onClose }: { onClose: () => void }) => (
  <LegalLayout title="Eliminación" subtitle="Protocolo de Borrado Definitivo" onClose={onClose}>
    <div className="bg-red-500/5 border border-red-500/20 p-8 rounded-3xl text-center space-y-6">
      <h3 className="text-red-500 font-bold text-2xl uppercase tracking-tighter">Solicitud de Derecho al Olvido</h3>
      <p className="text-gray-400 max-w-lg mx-auto text-sm leading-relaxed">
        En cumplimiento con las políticas de Meta Platforms, Inc., usted tiene el derecho de solicitar la eliminación total de sus datos de negocio e integraciones.
      </p>
      
      <div className="bg-gray-950 p-6 rounded-2xl border border-gray-800 shadow-inner inline-block">
        <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Enviar Correo Electrónico a:</p>
        <p className="text-xl font-mono text-white select-all border-b border-blue-500/30 pb-1">contacto@mitiendavirtual.cl</p>
        <p className="text-[10px] text-blue-500 mt-2 font-bold italic">ASUNTO: ELIMINACIÓN DE DATOS - [SU NOMBRE/RUT]</p>
      </div>

      <div className="text-[11px] text-gray-500 text-left max-w-sm mx-auto space-y-2">
        <p>• El proceso elimina: Catálogos, Credenciales de Meta y Perfiles.</p>
        <p>• Tiempo estimado: 24 a 48 horas hábiles.</p>
      </div>
    </div>
  </LegalLayout>
);

// --- VISTA: SOPORTE ---
export const SupportPage = ({ onClose }: { onClose: () => void }) => (
  <LegalLayout title="Soporte" subtitle="Centro de Asistencia" onClose={onClose}>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <a href="mailto:contacto@mitiendavirtual.cl" className="p-8 bg-blue-600/10 border border-blue-500/20 rounded-3xl text-center hover:scale-[1.02] transition-all">
        <h4 className="text-white font-bold text-xl uppercase tracking-tight">Canal de Email</h4>
        <p className="text-blue-400 mt-2 font-mono text-sm">contacto@mitiendavirtual.cl</p>
      </a>
      <a href="https://wa.me/56954080571" target="_blank" className="p-8 bg-emerald-600/10 border border-emerald-500/20 rounded-3xl text-center hover:scale-[1.02] transition-all">
        <h4 className="text-white font-bold text-xl uppercase tracking-tight">WhatsApp Directo</h4>
        <p className="text-emerald-400 mt-2 font-mono text-sm">+56 9 5408 0571</p>
      </a>
    </div>
  </LegalLayout>
);