import React from 'react';
import { useNavigate } from 'react-router-dom';

// --- PLANTILLA DE DISEÑO ---
const LegalLayout = ({ title, children }: { title: string, children: React.ReactNode }) => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-black text-gray-300 p-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <button 
          onClick={() => navigate('/')}
          className="mb-8 text-sm text-blue-500 hover:text-blue-400 flex items-center gap-2"
        >
          ← Volver al inicio
        </button>
        <h1 className="text-3xl font-bold text-white mb-6 border-b border-gray-800 pb-4">{title}</h1>
        <div className="space-y-4 text-sm leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- 1. POLÍTICA DE PRIVACIDAD ---
export const PrivacyPolicy = () => (
  <LegalLayout title="Política de Privacidad">
    <p>Última actualización: Enero 2026</p>
    <p>En <strong>mitiendavirtual.cl</strong>, respetamos su privacidad y estamos comprometidos a protegerla mediante el cumplimiento de esta política.</p>
    <h3 className="text-white font-bold mt-4">1. Información que recopilamos</h3>
    <p>Recopilamos información que usted nos proporciona directamente al registrarse, como su nombre, correo electrónico e información de perfil público de Google o Instagram, necesaria para el funcionamiento del servicio de automatización.</p>
    <h3 className="text-white font-bold mt-4">2. Uso de la información</h3>
    <p>Utilizamos su información para proporcionar, mantener y mejorar nuestros servicios de automatización (Chatbots), así como para comunicarnos con usted sobre actualizaciones del servicio.</p>
    <h3 className="text-white font-bold mt-4">3. Compartir información</h3>
    <p>No vendemos ni alquilamos sus datos personales a terceros. Solo compartimos información con proveedores de servicios (como Google Cloud o Meta) estrictamente necesarios para la operación de la plataforma.</p>
  </LegalLayout>
);

// --- 2. TÉRMINOS Y CONDICIONES ---
export const TermsOfService = () => (
  <LegalLayout title="Términos y Condiciones">
    <p>Bienvenido a <strong>mitiendavirtual.cl</strong>.</p>
    <h3 className="text-white font-bold mt-4">1. Aceptación de los términos</h3>
    <p>Al acceder o utilizar nuestros servicios, usted acepta estar legalmente vinculado por estos términos. Si no está de acuerdo, no utilice nuestros servicios.</p>
    <h3 className="text-white font-bold mt-4">2. Uso del servicio</h3>
    <p>Usted se compromete a utilizar nuestros servicios de automatización solo para fines legales y comerciales legítimos. Está prohibido el uso de nuestros bots para enviar SPAM o contenido ofensivo.</p>
    <h3 className="text-white font-bold mt-4">3. Responsabilidad</h3>
    <p>mitiendavirtual.cl no se hace responsable por las interrupciones del servicio causadas por terceros (caídas de Instagram, WhatsApp o proveedores de internet).</p>
  </LegalLayout>
);

// --- 3. ELIMINACIÓN DE DATOS (REQUISITO DE META) ---
export const DataDeletion = () => (
  <LegalLayout title="Instrucciones de Eliminación de Datos">
    <p>De acuerdo con las reglas de la Plataforma de Facebook/Meta, proporcionamos las instrucciones para que los usuarios soliciten la eliminación de sus datos.</p>
    <h3 className="text-white font-bold mt-4">¿Cómo solicitar el borrado?</h3>
    <p>Si desea eliminar su cuenta y todos los datos asociados de nuestros servidores, siga estos pasos:</p>
    <ol className="list-decimal pl-5 space-y-2 mt-2">
      <li>Envíe un correo electrónico a <strong>contacto@mitiendavirtual.cl</strong> (o su correo de soporte).</li>
      <li>Use el asunto: "Solicitud de Eliminación de Datos".</li>
      <li>Incluya el correo electrónico asociado a su cuenta.</li>
    </ol>
    <p className="mt-4">Procesaremos su solicitud en un plazo máximo de 72 horas hábiles y le confirmaremos la eliminación total de sus registros.</p>
  </LegalLayout>
);