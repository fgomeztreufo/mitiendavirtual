import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

// Declaración para evitar errores de TypeScript con el objeto FB global
declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

const CONFIG_ID = '1710544543478147'; // Tu ID de Configuración de Meta
const APP_ID = '1397698478805069';    // Tu ID de Aplicación

export default function WhatsAppConnector() {
  const [loading, setLoading] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);

  // 1. Carga inicial del SDK de Meta
  useEffect(() => {
    window.fbAsyncInit = function () {
      window.FB.init({
        appId: APP_ID,
        cookie: true,
        xfbml: true,
        version: 'v25.0'
      });
      setSdkReady(true);
    };

    const scriptId = 'facebook-jssdk';
    if (!document.getElementById(scriptId)) {
      const js = document.createElement('script');
      js.id = scriptId;
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      document.body.appendChild(js);
    } else {
      setSdkReady(true);
    }
  }, []);

  // 2. Función para disparar el Popup de Meta
  const launchWhatsAppLogin = () => {
    if (!window.FB) return;

    setLoading(true);
    window.FB.login((response: any) => {
      setLoading(false);
      if (response.authResponse) {
        const { code } = response.authResponse;
        console.log("Código de autorización recibido:", code);
        // AQUÍ DEBES ENVIAR EL 'code' A TU BACKEND
        handleCodeExchange(code);
      } else {
        console.log("El usuario canceló el inicio de sesión");
      }
    }, {
      config_id: CONFIG_ID,
      response_type: 'code',
      override_permissions: true,
      auth_type: 'rerequest' // Fuerza a que se pidan solo los permisos del config_id
    });
  };

  // 3. Simulación de intercambio con tu backend
  const handleCodeExchange = async (code: string) => {
    try {
      const response = await fetch('/api/whatsapp-link-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      
      if (response.ok) {
        Swal.fire('¡Éxito!', 'Cuenta vinculada correctamente.', 'success');
      } else {
        throw new Error('Error al vincular');
      }
    } catch (error) {
      Swal.fire('Error', 'No se pudo completar la vinculación.', 'error');
    }
  };

  return (
    <div className="p-6 border rounded-xl shadow-lg bg-white">
      <h2 className="text-xl font-bold mb-4">Conexión de WhatsApp</h2>
      <button
        onClick={launchWhatsAppLogin}
        disabled={!sdkReady || loading}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
      >
        {loading ? 'Procesando...' : 'Conectar con WhatsApp'}
      </button>
      {!sdkReady && <p className="text-sm text-gray-500 mt-2">Cargando SDK de Meta...</p>}
    </div>
  );
}