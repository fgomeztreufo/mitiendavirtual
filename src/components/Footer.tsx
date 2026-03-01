interface FooterProps {
  onNavigate: (tab: string) => void;
  variant?: 'index' | 'login' | 'dashboard' | 'transparent';
}

export default function Footer({ onNavigate, variant = 'transparent' }: FooterProps) {
  // Definimos los estilos de fondo según la variante
  const bgStyles = {
    index: 'bg-transparent', // Se mimetiza con las estrellas
    login: 'bg-[#1a1a1a]',   // Color exacto del fondo de tu Login
    dashboard: 'bg-[#050505]', // Color de fondo del área de contenido del Dashboard
    transparent: 'bg-transparent'
  };

  return (
    <footer className={`w-full ${bgStyles[variant]} text-gray-400 py-12 px-6 border-t border-white/5 transition-colors duration-500`}>
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
        
        {/* Marca */}
        <div className="flex flex-col space-y-4">
          <h3 className="text-white font-bold text-2xl tracking-tighter">
            MiTienda<span className="text-blue-500">Virtual</span>
          </h3>
          <p className="text-xs text-gray-500 leading-relaxed max-w-[200px]">
            Infraestructura inteligente para el comercio moderno en Chile.
          </p>
        </div>

        {/* INFORMACIÓN LEGAL (Dato vital para Meta) */}
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
              <span className="text-gray-300">LOS CASTAÑOS 1088, PUENTE ALTO</span>
            </li>
          </ul>
        </div>

        {/* Soporte y Enlaces */}
        <div className="md:text-right space-y-4">
          <h4 className="text-gray-500 font-semibold uppercase text-[10px] tracking-[0.3em]">
            Documentación
          </h4>
          <ul className="space-y-3 text-sm">
            <li>
              <button onClick={() => onNavigate('terms')} className="text-gray-400 hover:text-white transition-all">
                Términos de Servicio
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate('privacy')} className="text-gray-400 hover:text-white transition-all">
                Privacidad
              </button>
            </li>
            <li className="text-[11px] text-gray-600 pt-2">
              Santiago, Chile
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-[10px] text-gray-700 tracking-[0.2em] uppercase">
          © 2026 MiTiendaVirtual • Tech Provider Status: Pending
        </p>
      </div>
    </footer>
  );
}