import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

const APP_ID = '1397698478805069';
const CONFIG_ID = '1710544543478147';

type ConnectionStatus = 'idle' | 'loading-sdk' | 'sdk-ready' | 'connecting' | 'exchanging' | 'success' | 'error';

export default function WhatsAppConnector() {
  const [status, setStatus] = useState<ConnectionStatus>('loading-sdk');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    window.fbAsyncInit = function () {
      window.FB.init({
        appId: APP_ID,
        cookie: true,
        xfbml: true,
        version: 'v25.0'
      });
      setStatus('sdk-ready');
    };

    const scriptId = 'facebook-jssdk';
    if (!document.getElementById(scriptId)) {
      const js = document.createElement('script');
      js.id = scriptId;
      js.src = 'https://connect.facebook.net/en_US/sdk.js';
      document.body.appendChild(js);
    } else if (window.FB) {
      setStatus('sdk-ready');
    }
  }, []);

  const launchWhatsAppLogin = () => {
    if (!window.FB) return;

    setStatus('connecting');
    setErrorMsg('');

    window.FB.login((response: any) => {
      if (response.authResponse) {
        const { code } = response.authResponse;
        handleCodeExchange(code);
      } else {
        setStatus('sdk-ready');
        Swal.fire('Cancelado', 'No se completó la vinculación con Meta.', 'info');
      }
    }, {
      config_id: CONFIG_ID,
      response_type: 'code',
      override_default_response_type: true,
      extras: {
        sessionInfoVersion: '3',
        version: 'v4'
      }
    });
  };

  const handleCodeExchange = async (code: string) => {
    setStatus('exchanging');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setStatus('error');
        setErrorMsg('Sesión expirada.');
        Swal.fire('Error', 'Debes iniciar sesión antes de vincular WhatsApp.', 'error');
        return;
      }

      const response = await fetch('/api/whatsapp-link-start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ code })
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        setStatus('success');
        Swal.fire({
          icon: 'success',
          title: '¡Conectado!',
          text: data.connection?.display_phone_number
            ? `Número ${data.connection.display_phone_number} vinculado correctamente.`
            : 'Tu cuenta de WhatsApp fue vinculada correctamente.',
        });
      } else {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Error al vincular');
      }
    } catch (error: any) {
      setStatus('error');
      setErrorMsg(error.message || 'Error desconocido');
      Swal.fire('Error', error.message || 'No se pudo completar la vinculación.', 'error');
    }
  };

  const buttonLabel = {
    'loading-sdk': 'Cargando SDK de Meta...',
    'sdk-ready': 'Conectar con WhatsApp',
    'connecting': 'Conectando con Meta...',
    'exchanging': 'Vinculando cuenta...',
    'success': '✓ WhatsApp conectado',
    'error': 'Reintentar conexión',
    'idle': 'Conectar con WhatsApp',
  }[status];

  const isDisabled = status === 'loading-sdk' || status === 'connecting' || status === 'exchanging';
  const isProcessing = status === 'connecting' || status === 'exchanging';

  return (
    <div className="p-6 border rounded-xl shadow-lg bg-white max-w-md">
      <h2 className="text-xl font-bold mb-2">Conexión de WhatsApp</h2>
      <p className="text-sm text-gray-500 mb-4">
        Vincula tu número de WhatsApp Business para que tu asistente IA pueda responder a tus clientes.
      </p>

      <button
        onClick={status === 'success' ? undefined : launchWhatsAppLogin}
        disabled={isDisabled || status === 'success'}
        className={`w-full px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
          status === 'success'
            ? 'bg-green-600 text-white cursor-default'
            : status === 'error'
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-[#25D366] text-white hover:bg-[#1da851] disabled:bg-gray-400'
        }`}
      >
        {isProcessing && (
          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {buttonLabel}
      </button>

      {status === 'error' && errorMsg && (
        <p className="text-sm text-red-500 mt-2">{errorMsg}</p>
      )}
    </div>
  );
}
