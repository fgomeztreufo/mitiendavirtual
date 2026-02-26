import React from 'react';
import { useNavigate } from 'react-router-dom';

// --- PLANTILLA DE DISEÑO UNIFICADA ---
const LegalLayout = ({ title, children }: { title: string, children: React.ReactNode }) => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-black text-gray-300 p-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <button 
          onClick={() => navigate('/')}
          className="mb-8 text-sm text-blue-500 hover:text-blue-400 flex items-center gap-2 transition-colors"
        >
          ← Volver al inicio
        </button>
        <h1 className="text-3xl font-bold text-white mb-6 border-b border-gray-800 pb-4">{title}</h1>
        <div className="space-y-6 text-sm leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- 1. POLÍTICA DE PRIVACIDAD ---
export const PrivacyPolicy = () => (
  <LegalLayout title="Política de Privacidad">
    <p className="italic text-gray-500">Última actualización: 26 de febrero, 2026</p>
    <p>
      En <strong>mitiendavirtual.cl</strong>, propiedad de <strong>Felipe Gomez Treufo</strong>, la privacidad de nuestros usuarios es una prioridad. Esta política describe cómo recopilamos y protegemos sus datos bajo la <strong>Ley 19.628</strong> de Protección de la Vida Privada en Chile.
    </p>

    <section>
      <h3 className="text-white font-bold mb-2">1. Responsable del Tratamiento</h3>
      <p>
        El responsable legal de sus datos personales es <strong>Felipe Gomez Treufo</strong>, con domicilio en <strong>Los Castaños 1088, Puente Alto, Región Metropolitana, Chile</strong>. 
        Contacto: <span className="text-blue-400">contacto@mitiendavirtual.cl</span>.
      </p>
    </section>

    <section>
      <h3 className="text-white font-bold mb-2">2. Datos Recopilados</h3>
      <p>
        Recopilamos información de registro (nombre y correo electrónico) y datos técnicos proporcionados por las APIs de Meta (Instagram/Facebook) necesarios exclusivamente para la ejecución de servicios de automatización de mensajería e Inteligencia Artificial.
      </p>
    </section>

    <section>
      <h3 className="text-white font-bold mb-2">3. Uso y Seguridad</h3>
      <p>
        No vendemos ni compartimos sus datos con terceros para fines publicitarios. Los datos se procesan con el único fin de gestionar sus suscripciones y flujos de Chatbots. Contamos con autenticación en dos pasos activa en toda nuestra infraestructura para garantizar la seguridad de la información.
      </p>
    </section>
  </LegalLayout>
);

// --- 2. TÉRMINOS Y CONDICIONES ---
export const TermsOfService = () => (
  <LegalLayout title="Términos y Condiciones">
    <p className="italic text-gray-500">Última actualización: 26 de febrero, 2026</p>
    <p>
      Bienvenido a <strong>mitiendavirtual.cl</strong>. Al utilizar nuestros servicios de automatización, usted acepta los presentes términos operados por <strong>Felipe Gomez Treufo</strong>.
    </p>

    <section>
      <h3 className="text-white font-bold mb-2">1. Planes de Suscripción</h3>
      <p>Ofrecemos los siguientes niveles de servicio:</p>
      <ul className="list-disc pl-5 mt-2 space-y-2">
        <li><strong>Plan Free:</strong> $0 mensual - Límite de 10 productos [cite: 2026-02-21].</li>
        <li><strong>Plan Basic:</strong> $14.990 mensual - Límite de 50 productos [cite: 2026-02-21].</li>
        <li><strong>Plan Pro:</strong> $39.990 mensual - Límite de 500 productos [cite: 2026-02-21].</li>
        <li><strong>Plan Full:</strong> $59.990 mensual - Límite de 2.000 productos y mensajes IA ilimitados bajo política de "Fair Use" [cite: 2026-02-21].</li>
      </ul>
    </section>

    <section>
      <h3 className="text-white font-bold mb-2">2. Representación Legal</h3>
      <p>
        El titular y representante legal del sitio es <strong>Felipe Gomez Treufo</strong>, domiciliado en <strong>Los Castaños 1088, Puente Alto</strong>. Este servicio se presta como profesional independiente bajo las normativas legales vigentes en la República de Chile.
      </p>
    </section>

    <section>
      <h3 className="text-white font-bold mb-2">3. Limitación de Responsabilidad</h3>
      <p>
        No nos hacemos responsables por interrupciones en los servicios de terceros como Instagram, WhatsApp o fallos de conexión ajenos a nuestra plataforma.
      </p>
    </section>
  </LegalLayout>
);

// --- 3. ELIMINACIÓN DE DATOS (REQUISITO OBLIGATORIO META) ---
export const DataDeletion = () => (
  <LegalLayout title="Instrucciones de Eliminación de Datos">
    <p>
      Cumpliendo con las políticas de la Plataforma de Meta, garantizamos el derecho de los usuarios a solicitar la eliminación total de sus datos almacenados.
    </p>

    <section>
      <h3 className="text-white font-bold mb-2">¿Cómo solicitar el borrado permanente?</h3>
      <p>Para eliminar su cuenta y registros de nuestros servidores, siga este procedimiento:</p>
      <ol className="list-decimal pl-5 mt-2 space-y-2">
        <li>Envíe un correo electrónico a <strong>contacto@mitiendavirtual.cl</strong>.</li>
        <li>Asunto: <strong>"Solicitud de Eliminación de Datos - [Su Nombre]"</strong>.</li>
        <li>Detalle el correo electrónico con el que se registró en la plataforma.</li>
      </ol>
      <p className="mt-4 text-gray-400">
        Confirmaremos la recepción y procesaremos la eliminación definitiva en un plazo no mayor a 72 horas hábiles.
      </p>
    </section>
  </LegalLayout>
);