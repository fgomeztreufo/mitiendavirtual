// src/components/WhatsAppView.tsx
export default function WhatsAppView() {
  return (
    <div className="animate-fade-in flex flex-col items-center justify-center h-[60vh] text-center">
      <div className="w-20 h-20 bg-green-900/30 rounded-full flex items-center justify-center mb-6">
        <svg className="w-10 h-10 text-green-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
        </svg>
      </div>
      <h2 className="text-3xl font-bold mb-3">WhatsApp Business</h2>
      <p className="text-gray-400 mb-6 max-w-md">
        Estamos afinando los últimos detalles para que tu IA pueda vender directamente por WhatsApp.
      </p>
      
      <span className="bg-yellow-600/20 text-yellow-400 border border-yellow-600/50 px-4 py-2 rounded-lg font-bold uppercase tracking-wider text-sm">
          🚧 Muy Pronto
      </span>

      <div className="mt-8 p-6 bg-gray-900 border border-gray-800 rounded-xl max-w-lg w-full">
          <h4 className="text-sm font-bold text-gray-300 mb-2 text-left">Lo que podrás hacer:</h4>
          <ul className="text-left space-y-2 text-sm text-gray-400">
              <li className="flex items-center gap-2">✅ Responder mensajes 24/7 automáticamente.</li>
              <li className="flex items-center gap-2">✅ Enviar audios naturales con voz de IA.</li>
              <li className="flex items-center gap-2">✅ Agendar citas y cerrar ventas en el chat.</li>
          </ul>
      </div>
    </div>
  )
}