import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Términos y Condiciones | JRS CARGO CR',
};

export default function TermsAndConditions() {
  return (
    <div className="section-padding bg-white min-h-[60vh]">
      <div className="container-max max-w-3xl">
        <h1 className="text-3xl font-bold text-brand-blue mb-6">Términos y Condiciones</h1>
        
        <div className="prose prose-blue max-w-none text-brand-text-gray">
          <p className="mb-4">
            [ESPACIO RESERVADO PARA LOS TÉRMINOS Y CONDICIONES]
          </p>
          <p className="mb-4">
            JRS CARGO deberá colocar posteriormente su texto legal definitivo en esta sección.
          </p>
        </div>
      </div>
    </div>
  );
}
