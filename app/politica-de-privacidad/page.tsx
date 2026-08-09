import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidad | JRS CARGO CR',
};

export default function PrivacyPolicy() {
  return (
    <div className="section-padding bg-white min-h-[60vh]">
      <div className="container-max max-w-3xl">
        <h1 className="text-3xl font-bold text-brand-blue mb-6">Política de Privacidad</h1>
        
        <div className="prose prose-blue max-w-none text-brand-text-gray">
          <p className="mb-4">
            [ESPACIO RESERVADO PARA LA POLÍTICA DE PRIVACIDAD]
          </p>
          <p className="mb-4">
            JRS CARGO deberá colocar posteriormente su texto legal definitivo en esta sección.
          </p>
        </div>
      </div>
    </div>
  );
}
