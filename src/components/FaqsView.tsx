import { useState } from 'react'
import { Session } from '@supabase/supabase-js'
import Swal from 'sweetalert2'

interface FaqsViewProps {
  session: Session
}

export default function FaqsView({ session }: FaqsViewProps) {
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  const downloadTemplate = (e: React.MouseEvent) => {
    // IMPORTANTE: Evita que el clic se propague al input de archivo
    e.stopPropagation();
    
    const template = "¿Cuáles son los horarios de atención? | Atendemos de lunes a viernes de 9:00 a 18:00 hrs.\n¿Tienen tienda física? | Somos una tienda 100% online con envíos a todo el país.\n¿Qué métodos de pago aceptan? | Aceptamos tarjetas de crédito, débito y transferencia bancaria.\n¿Realizan envíos a regiones? | Sí, enviamos a todas las regiones a través de Starken y Chilexpress.\n¿Cómo gestiono un cambio? | Para cambios, debes contactarnos por este chat.";
    
    const blob = new Blob([template], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'template_faqs.txt');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.txt')) {
      Swal.fire({ title: 'Error', text: 'Solo se permiten archivos .txt', icon: 'error', confirmButtonColor: '#3B82F6' });
      return;
    }
    setFile(selectedFile);
  };

  const sendToWebhook = async () => {
    if (!file) return;
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('faqs', file);
      
      // Se envía el user_id para que el Almacén Faqs lo registre correctamente
      const webhookUrl = `https://webhook.mitiendavirtual.cl/webhook/carga-faqs?user_id=${session.user.id}`;

      const response = await fetch(webhookUrl, { method: 'POST', body: formData });

      if (response.ok) {
        Swal.fire({ title: '¡Enviado!', text: 'Preguntas procesadas correctamente.', icon: 'success' });
        setFile(null);
      } else {
        throw new Error();
      }
    } catch (error) {
      Swal.fire({ title: 'Error', text: 'No se pudo cargar el archivo.', icon: 'error' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-white">Preguntas Frecuentes (FAQ)</h2>
        <p className="text-gray-400">Entrena a tu IA subiendo un archivo .txt con el formato Pregunta | Respuesta.</p>
      </header>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-2xl">
        {/* ÁREA DE CARGA */}
        <div className="relative flex flex-col items-center justify-center border-2 border-dashed border-gray-700 rounded-xl p-10 hover:border-blue-500 transition-colors group">
          
          {/* El input ahora solo cubre el área si NO hay un archivo seleccionado */}
          {!file && (
            <input 
              type="file" 
              accept=".txt" 
              onChange={handleFileUpload} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
            />
          )}

          <svg className="w-12 h-12 text-gray-500 group-hover:text-blue-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          
          <p className="text-gray-300 mb-2 text-center">
            {file ? `Seleccionado: ${file.name}` : 'Haz clic para subir o arrastra tu archivo .txt'}
          </p>
          
          {file && (
            <div className="flex gap-2 z-20">
                <button 
                  onClick={sendToWebhook} 
                  disabled={uploading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold transition-all disabled:opacity-50"
                >
                  {uploading ? 'Cargando...' : 'Confirmar Carga'}
                </button>
                <button onClick={() => setFile(null)} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg">Cancelar</button>
            </div>
          )}
        </div>

        {/* FOOTER CON DESCARGA */}
        <div className="mt-8 flex items-center justify-between border-t border-gray-800 pt-6">
            <div className="text-sm text-gray-500">
                <p>Formato: <span className="text-blue-400 font-mono">Pregunta | Respuesta</span></p>
            </div>
            
            {/* BOTÓN DE DESCARGA CON Z-INDEX ALTO */}
            <button 
                type="button"
                onClick={downloadTemplate}
                className="relative z-30 text-sm text-blue-500 hover:text-blue-400 flex items-center gap-1 font-medium p-2"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                Descargar Template
            </button>
        </div>
      </div>
    </div>
  )
}