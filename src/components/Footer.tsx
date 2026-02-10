export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="mt-12 border-t border-gray-800 pt-8 pb-4">
      <div className="flex flex-col md:flex-row justify-between items-center text-gray-500 text-sm">
        
        <div className="mb-4 md:mb-0">
          <span className="font-bold text-gray-300">MiTiendaVirtual</span> © {currentYear}
          <p className="text-xs mt-1">Potenciando Pymes con Inteligencia Artificial.</p>
        </div>

        <div className="flex gap-6">
          <a href="#" className="hover:text-white transition-colors">Soporte</a>
          <a href="#" className="hover:text-white transition-colors">Términos</a>
          <a href="#" className="hover:text-white transition-colors">Privacidad</a>
        </div>

        <div className="mt-4 md:mt-0 flex items-center gap-2 opacity-50">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs">Sistemas Operativos</span>
        </div>

      </div>
    </footer>
  )
}