interface FooterProps {
  onNavigate: (tab: string) => void;
}

export default function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="mt-12 border-t border-gray-800 pt-8 pb-4">
      <div className="flex flex-col md:flex-row justify-between items-center text-gray-500 text-sm">
        <div className="text-center md:text-left">
          <span className="font-bold text-gray-300">MiTiendaVirtual</span> © 2026
          <p className="text-[10px] text-gray-500">Rep. Legal: Felipe Gomez Treufo</p>
        </div>
        <div className="flex gap-6 mt-4 md:mt-0">
          <button onClick={() => onNavigate('support')} className="hover:text-white transition-colors">Soporte</button>
          <button onClick={() => onNavigate('terms')} className="hover:text-white transition-colors">Términos</button>
          <button onClick={() => onNavigate('privacy')} className="hover:text-white transition-colors">Privacidad</button>
          <button onClick={() => onNavigate('data-deletion')} className="text-[10px] hover:text-red-400 transition-colors">Eliminar Datos</button>
        </div>
      </div>
    </footer>
  )
}