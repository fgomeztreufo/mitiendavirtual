interface FooterProps {
  onNavigate: (tab: string) => void;
}

export default function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="bg-gray-900 text-gray-400 py-10 px-6 border-t border-gray-800">
    <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
      
      {/* Columna de Marca */}
      <div>
        <h3 className="text-white font-bold text-lg mb-2">MiTiendaVirtual</h3>
        <p className="text-sm">Potenciando tu comercio con IA y automatización.</p>
      </div>
  
      {/* Columna de Información Legal (VITAL PARA META) */}
      <div className="text-sm">
        <h4 className="text-white font-semibold mb-4 uppercase tracking-wider text-xs">Información Legal</h4>
        <ul className="space-y-2">
          <li><span className="text-gray-500">Operado por:</span> <b className="text-gray-300">FELIPE ALONSO GOMEZ TREUFO</b></li>
          <li><span className="text-gray-500">RUT:</span> 16.208.020-2</li>
          <li><span className="text-gray-500">Dirección:</span> LOS CASTAÑOS 1088, PUENTE ALTO</li>
          <li>Santiago, Chile</li>
        </ul>
      </div>
  
      {/* Columna de Enlaces */}
      <div className="text-sm md:text-right">
        <h4 className="text-white font-semibold mb-4 uppercase tracking-wider text-xs">Soporte</h4>
        <ul className="space-y-2">
          <li><a href="/terms" className="hover:text-blue-400 transition-colors">Términos y Condiciones</a></li>
          <li><a href="/privacy" className="hover:text-blue-400 transition-colors">Política de Privacidad</a></li>
        </ul>
      </div>
  
    </div>
    <div className="mt-10 pt-6 border-t border-gray-800 text-center text-xs">
      © 2026 MiTiendaVirtual. Todos los derechos reservados.
    </div>
  </footer>
  )
}