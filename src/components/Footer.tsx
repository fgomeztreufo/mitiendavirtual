interface FooterProps {
  onNavigate: (tab: string) => void;
  variant?: 'index' | 'login' | 'dashboard' | 'transparent';
}

export default function Footer({ onNavigate, variant = 'transparent' }: FooterProps) {
  const bgStyles = {
    index: 'bg-transparent',
    login: 'bg-[#1a1a1a]',
    dashboard: 'bg-[#050505]',
    transparent: 'bg-transparent'
  };

  return (
    <footer className={`w-full ${bgStyles[variant]} text-gray-400 py-12 px-6 border-t border-white/5 transition-colors duration-500`}>
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 text-left">
        
        {/* COLUMNA 1: Identidad Visual */}
        <div className="flex flex-col space-y-4">
          <h3 className="text-white font-bold text-2xl tracking-tighter">
            MiTienda<span className="text-blue-500">Virtual</span>
          </h3>
          <p className="text-xs text-gray-500 leading-relaxed max-w-[220px]">
            Infraestructura inteligente para el comercio moderno en Chile.
          </p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-[9px] text-gray-600 uppercase tracking-widest font-bold">
              Tech Provider Status: Pending
            </span>
          </div>
        </div>

        {/* COLUMNA 2: Datos Legales (Crítico para Meta) */}
        <div className="space-y-4">
          <h4 className="text-blue-400/80 font-semibold uppercase text-[10px] tracking-[0.3em]">
            Datos del Titular
          </h4>
          <ul className="space-y-3 text-[13px]">
            <li className="flex flex-col">
              <span className="text-[10px] text-gray-600 uppercase tracking-wider">Representante</span>
              <b className="text-gray-200">FELIPE ALONSO GOMEZ TREUFO</b>
            </li>
            <li className="flex flex-col">
              <span className="text-[10px] text-gray-600 uppercase tracking-wider">RUT</span>
              <span className="text-gray-300">16.208.020-2</span>
            </li>
            <li className="flex flex-col">
              <span className="text-[10px] text-gray-600 uppercase tracking-wider">Domicilio Comercial</span>
              <span className="text-gray-400 text-[11px] uppercase">Los Castaños 1088, Puente Alto</span>
            </li>
          </ul>
        </div>

        {/* COLUMNA 3: Navegación y Soporte */}
        <div className="md:text-right space-y-4">
          <h4 className="text-gray-500 font-semibold uppercase text-[10px] tracking-[0.3em]">
            Documentación
          </h4>
          <ul className="space-y-3 text-sm flex flex-col md:items-end">
            <li>
              <button onClick={() => onNavigate('terms')} className="hover:text-white transition-colors">
                Términos de Servicio
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate('privacy')} className="hover:text-white transition-colors">
                Privacidad
              </button>
            </li>
            {/* ESTE ES EL BOTÓN QUE FALTABA VISIBLEMENTE */}
            <li>
              <button 
                onClick={() => onNavigate('data-deletion')} 
                className="text-red-500/70 hover:text-red-400 text-[11px] uppercase tracking-tighter font-bold border-b border-red-900/30 pb-0.5 transition-all"
              >
                Eliminación de Datos
              </button>
            </li>
            <li className="pt-2">
              <button 
                onClick={() => onNavigate('support')} 
                className="text-blue-400 font-bold text-xs uppercase tracking-widest hover:text-blue-300"
              >
                Centro de Ayuda
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-[10px] text-gray-700 tracking-[0.4em] uppercase font-mono">
          © 2026 MiTiendaVirtual • Santiago, CL
        </p>
      </div>
    </footer>
  );
}