'use client';

import { useState, useMemo, useEffect } from 'react';
import { MessageCircle, Box, Scale } from 'lucide-react';

const LOCAL_RATES = {
  usaAir: 7,
  usaSea: 30,
  spainAir: 15,
  chinaAir: 17,
};

type Origin = 'USA' | 'Spain' | 'China';
type Service = 'Air' | 'Sea';
type WeightUnit = 'lb' | 'kg';
type SeaMethod = 'ft3' | 'dimensions';

export default function QuoteCalculator() {
  const [origin, setOrigin] = useState<Origin>('USA');
  const [service, setService] = useState<Service>('Air');
  
  // Air state
  const [weight, setWeight] = useState<string>('');
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('lb');
  
  // Sea state
  const [seaMethod, setSeaMethod] = useState<SeaMethod>('ft3');
  const [ft3, setFt3] = useState<string>('');
  const [length, setLength] = useState<string>('');
  const [width, setWidth] = useState<string>('');
  const [height, setHeight] = useState<string>('');

  // Handle Event from Rates
  useEffect(() => {
    const handleSetQuote = (event: Event) => {
      const customEvent = event as CustomEvent<{ origin: Origin; service: Service }>;
      if (customEvent.detail) {
        setOrigin(customEvent.detail.origin);
        setService(customEvent.detail.service);
      }
    };

    window.addEventListener('setQuoteCalculator', handleSetQuote);
    return () => window.removeEventListener('setQuoteCalculator', handleSetQuote);
  }, []);

  // Handle Origin Change
  const handleOriginChange = (newOrigin: Origin) => {
    setOrigin(newOrigin);
    if (newOrigin !== 'USA') {
      setService('Air');
    }
  };

  // Calculations
  const quoteResult = useMemo(() => {
    let total = 0;
    let rateApplied = 0;
    let appliedDimensionStr = '';
    
    try {
      if (service === 'Air') {
        const w = parseFloat(weight) || 0;
        const weightInLb = weightUnit === 'kg' ? w * 2.20462 : w;
        
        if (origin === 'USA') rateApplied = LOCAL_RATES.usaAir;
        if (origin === 'Spain') rateApplied = LOCAL_RATES.spainAir;
        if (origin === 'China') rateApplied = LOCAL_RATES.chinaAir;
        
        total = weightInLb * rateApplied;
        appliedDimensionStr = `${w || 0} ${weightUnit} (≈ ${weightInLb.toFixed(2)} lb)`;
      } else if (service === 'Sea' && origin === 'USA') {
        rateApplied = LOCAL_RATES.usaSea;
        let calculatedFt3 = 0;
        
        if (seaMethod === 'ft3') {
          calculatedFt3 = parseFloat(ft3) || 0;
          appliedDimensionStr = `${calculatedFt3 || 0} ft³`;
        } else {
          const l = parseFloat(length) || 0;
          const w = parseFloat(width) || 0;
          const h = parseFloat(height) || 0;
          calculatedFt3 = (l / 30.48) * (w / 30.48) * (h / 30.48);
          appliedDimensionStr = `${l}×${w}×${h} cm (≈ ${calculatedFt3.toFixed(2)} ft³)`;
        }
        
        total = calculatedFt3 * rateApplied;
      }
    } catch (e) {
      console.error("Error calculating total:", e);
    }

    const finalTotal = isNaN(total) || total < 0 ? 0 : total;

    return {
      total: finalTotal.toFixed(2),
      rateApplied,
      appliedDimensionStr,
      isValid: finalTotal > 0,
    };
  }, [origin, service, weight, weightUnit, seaMethod, ft3, length, width, height]);

  const originName = origin === 'USA' ? 'Estados Unidos' : origin === 'Spain' ? 'España' : 'China';
  const serviceName = service === 'Air' ? 'Aéreo' : 'Marítimo';
  const rateLabel = service === 'Air' ? `US$${quoteResult.rateApplied}/lb` : `US$${quoteResult.rateApplied}/ft³`;

  // WhatsApp Message
  const waMessage = `Hola JRS CARGO 👋\nQuiero confirmar una cotización.\n\nOrigen: ${originName}\nServicio: ${serviceName}\nPeso/Dimensiones: ${quoteResult.appliedDimensionStr}\nTarifa: ${rateLabel}\nEstimado web: US$${quoteResult.total}\n\n¿Me pueden ayudar a confirmar el envío?`;
  const waUrl = `https://wa.me/50672601238?text=${encodeURIComponent(waMessage)}`;

  return (
    <section id="cotizador" className="section-padding bg-brand-bg-section relative overflow-hidden">
      <div className="absolute top-0 right-0 w-full h-full bg-hero-gradient opacity-[0.02] pointer-events-none mix-blend-multiply" />
      
      <div className="container-max relative z-10">
        <div className="text-center mb-12">
          <h2 className="section-title">¿Cuánto cuesta traer mi paquete?</h2>
          <p className="section-subtitle">Obtén una estimación en segundos.</p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 max-w-5xl mx-auto">
          {/* Form */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl shadow-soft">
            {/* Paso 1 */}
            <div className="mb-8 relative z-20">
              <h3 className="text-lg font-bold text-brand-blue mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-brand-blue text-white flex items-center justify-center text-sm">1</span>
                Origen
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {(['USA', 'Spain', 'China'] as Origin[]).map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      handleOriginChange(o);
                    }}
                    className={`py-3 px-4 rounded-xl font-medium transition-all duration-200 border-2 cursor-pointer ${
                      origin === o 
                        ? 'border-brand-blue bg-brand-blue text-white shadow-md' 
                        : 'border-gray-200 text-brand-text-gray hover:border-brand-blue/30 hover:bg-gray-50'
                    }`}
                  >
                    {o === 'USA' ? 'EE. UU.' : o === 'Spain' ? 'España' : 'China'}
                  </button>
                ))}
              </div>
            </div>

            {/* Paso 2 */}
            <div className="mb-8 relative z-20">
              <h3 className="text-lg font-bold text-brand-blue mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-brand-blue text-white flex items-center justify-center text-sm">2</span>
                Tipo de envío
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setService('Air');
                  }}
                  className={`py-3 px-4 rounded-xl font-medium transition-all duration-200 border-2 cursor-pointer ${
                    service === 'Air' 
                      ? 'border-brand-blue bg-brand-blue text-white shadow-md' 
                      : 'border-gray-200 text-brand-text-gray hover:border-brand-blue/30 hover:bg-gray-50'
                  }`}
                >
                  Aéreo
                </button>
                {origin === 'USA' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setService('Sea');
                    }}
                    className={`py-3 px-4 rounded-xl font-medium transition-all duration-200 border-2 cursor-pointer ${
                      service === 'Sea' 
                        ? 'border-brand-blue bg-brand-blue text-white shadow-md' 
                        : 'border-gray-200 text-brand-text-gray hover:border-brand-blue/30 hover:bg-gray-50'
                    }`}
                  >
                    Marítimo
                  </button>
                )}
              </div>
            </div>

            {/* Paso 3: Inputs */}
            <div className="relative z-20">
              <h3 className="text-lg font-bold text-brand-blue mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-brand-blue text-white flex items-center justify-center text-sm">3</span>
                Detalles del paquete
              </h3>
              
              {service === 'Air' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-brand-text-gray mb-2">Peso</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-brand-text-light">
                        <Scale size={18} />
                      </div>
                      <input 
                        type="number" 
                        min="0"
                        step="0.1"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder="Ej. 10"
                        className="input-field pl-11 w-full relative z-30"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-text-gray mb-2">Unidad</label>
                    <select 
                      value={weightUnit}
                      onChange={(e) => setWeightUnit(e.target.value as WeightUnit)}
                      className="select-field w-full relative z-30"
                    >
                      <option value="lb">Libras (lb)</option>
                      <option value="kg">Kilogramos (kg)</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex gap-4 mb-4 border-b border-gray-100 pb-2">
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setSeaMethod('ft3');
                      }}
                      className={`text-sm font-medium pb-2 border-b-2 transition-colors cursor-pointer ${seaMethod === 'ft3' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-brand-text-gray'}`}
                    >
                      Ingresar volumen (ft³)
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setSeaMethod('dimensions');
                      }}
                      className={`text-sm font-medium pb-2 border-b-2 transition-colors cursor-pointer ${seaMethod === 'dimensions' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-brand-text-gray'}`}
                    >
                      Ingresar dimensiones (cm)
                    </button>
                  </div>

                  {seaMethod === 'ft3' ? (
                    <div>
                      <label className="block text-sm font-medium text-brand-text-gray mb-2">Volumen en pies cúbicos</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-brand-text-light">
                          <Box size={18} />
                        </div>
                        <input 
                          type="number" 
                          min="0"
                          step="0.1"
                          value={ft3}
                          onChange={(e) => setFt3(e.target.value)}
                          placeholder="Ej. 2.5"
                          className="input-field pl-11 w-full relative z-30"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-brand-text-gray mb-2">Largo (cm)</label>
                        <input 
                          type="number" 
                          min="0"
                          value={length}
                          onChange={(e) => setLength(e.target.value)}
                          placeholder="30"
                          className="input-field w-full relative z-30"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-brand-text-gray mb-2">Ancho (cm)</label>
                        <input 
                          type="number" 
                          min="0"
                          value={width}
                          onChange={(e) => setWidth(e.target.value)}
                          placeholder="30"
                          className="input-field w-full relative z-30"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-brand-text-gray mb-2">Alto (cm)</label>
                        <input 
                          type="number" 
                          min="0"
                          value={height}
                          onChange={(e) => setHeight(e.target.value)}
                          placeholder="30"
                          className="input-field w-full relative z-30"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Result Card */}
          <div className="lg:col-span-5 relative z-20">
            <div className="bg-brand-blue rounded-3xl p-6 sm:p-8 text-white shadow-xl h-full flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-bl-full pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand-yellow/10 rounded-tr-full pointer-events-none" />
              
              <h3 className="text-xl font-bold mb-6 text-brand-yellow z-10">Tu envío estimado</h3>
              
              <div className="space-y-4 mb-8 flex-1 z-10">
                <div className="flex justify-between items-center border-b border-white/10 pb-3">
                  <span className="text-brand-light/70 text-sm">Origen</span>
                  <span className="font-semibold">{originName}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/10 pb-3">
                  <span className="text-brand-light/70 text-sm">Servicio</span>
                  <span className="font-semibold">{serviceName}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/10 pb-3">
                  <span className="text-brand-light/70 text-sm">Tarifa aplicada</span>
                  <span className="font-semibold">{rateLabel}</span>
                </div>
                {quoteResult.isValid && (
                  <div className="flex justify-between items-center border-b border-white/10 pb-3">
                    <span className="text-brand-light/70 text-sm">Peso/Volumen</span>
                    <span className="font-semibold text-right max-w-[150px]">{quoteResult.appliedDimensionStr}</span>
                  </div>
                )}
              </div>

              <div className="bg-white/10 rounded-2xl p-5 mb-6 backdrop-blur-sm z-10">
                <span className="block text-brand-light/80 text-sm mb-1">TOTAL ESTIMADO</span>
                <div className="text-4xl font-black">
                  {quoteResult.isValid ? `US$${quoteResult.total}` : 'US$0.00'}
                </div>
              </div>

              {quoteResult.isValid ? (
                <a 
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold transition-all duration-300 z-30 bg-[#25D366] hover:bg-[#128C7E] text-white shadow-lg hover:shadow-xl transform hover:-translate-y-1 relative cursor-pointer pointer-events-auto"
                >
                  <MessageCircle size={22} />
                  Confirmar por WhatsApp
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold transition-all duration-300 z-30 bg-gray-400 text-gray-200 cursor-not-allowed opacity-50 relative pointer-events-none"
                >
                  <MessageCircle size={22} />
                  Confirmar por WhatsApp
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
