'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import { X, Send, Bot, Loader2, Sparkles, User, Mail, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

const AnimatedRobotFace = () => {
  const faceRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  // Smooth out the mouse movement
  const springConfig = { damping: 25, stiffness: 250, mass: 0.5 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);
  
  // Map normalized vector [-1, 1] to pixel offsets
  const eyeX = useTransform(smoothX, [-1, 1], [-6, 6]);
  const eyeY = useTransform(smoothY, [-1, 1], [-4, 4]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!faceRef.current) return;
      
      const rect = faceRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;
      
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const maxDistance = 400; // distance at which eyes reach edge
      const normalizedDist = Math.min(distance / maxDistance, 1);
      
      const angle = Math.atan2(deltaY, deltaX);
      
      // Calculate final x and y mapped to [-1, 1] range
      mouseX.set(Math.cos(angle) * normalizedDist);
      mouseY.set(Math.sin(angle) * normalizedDist);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <div ref={faceRef} className="w-16 h-16 rounded-full bg-gradient-to-b from-gray-50 to-gray-200 shadow-[0_8px_30px_rgba(0,0,0,0.2)] flex items-center justify-center relative overflow-hidden border border-white">
      {/* Outer Glow Ring (Brand Colors: Blue, Yellow, Red) */}
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="absolute w-[150%] h-[150%] bg-[conic-gradient(from_0deg,transparent,#12435E,#F9B233,#ED3B4A,transparent)] opacity-90"
      />
      
      {/* Background to mask out the center of the ring */}
      <div className="absolute inset-1 rounded-full bg-white z-0"></div>
      
      {/* Inner Black Visor */}
      <div className="absolute w-[78%] h-[62%] bg-gradient-to-b from-gray-800 to-black rounded-[2rem] flex items-center justify-center gap-2 shadow-inner overflow-hidden border border-gray-700/30 z-10">
        {/* Reflection */}
        <div className="absolute top-0 left-1/4 right-1/4 h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-full blur-[1px]"></div>
        
        {/* Eyes Group with Mouse Tracking */}
        <motion.div 
          style={{ x: eyeX, y: eyeY }}
          className="flex gap-2 relative z-10"
        >
          {/* Left Eye (Blinking only) */}
          <motion.div 
            animate={{ scaleY: [1, 0.1, 1, 1, 1] }}
            transition={{ duration: 4, repeat: Infinity, times: [0, 0.05, 0.1, 0.5, 1] }}
            className="w-2.5 h-4 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.9)]"
          />
          {/* Right Eye (Blinking only) */}
          <motion.div 
            animate={{ scaleY: [1, 0.1, 1, 1, 1] }}
            transition={{ duration: 4, repeat: Infinity, times: [0, 0.05, 0.1, 0.5, 1] }}
            className="w-2.5 h-4 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.9)]"
          />
        </motion.div>
      </div>
    </div>
  );
};

export default function ChatBotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [formError, setFormError] = useState('');

  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    maxSteps: 5,
    body: {
      userName,
      userEmail
    }
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, error]);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const trimmedName = userName.trim();
    const trimmedEmail = userEmail.trim();

    if (!trimmedName) {
      setFormError('Por favor ingresa tu nombre');
      return;
    }
    if (!trimmedEmail) {
      setFormError('Por favor ingresa tu correo');
      return;
    }
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setFormError('Por favor ingresa un correo válido');
      return;
    }

    setUserName(trimmedName);
    setUserEmail(trimmedEmail);
    setIsRegistered(true);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-[calc(100vw-3rem)] sm:w-[400px] h-[65vh] sm:h-[500px] max-h-[600px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-200 animate-slide-up">
          {/* Header */}
          <div className="bg-brand-blue p-4 flex justify-between items-center text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center p-1">
                <Image src="/logo.png" alt="JRS Cargo" width={32} height={32} className="w-full h-auto object-contain" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Clari</h3>
                <p className="text-xs text-brand-yellow font-medium">Asistente en línea</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-white/70 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Registration Form or Chat */}
          {!isRegistered ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-50">
              <div className="w-12 h-12 rounded-full bg-brand-blue/10 flex items-center justify-center mb-4">
                <Bot size={24} className="text-brand-blue" />
              </div>
              <h4 className="text-lg font-bold text-gray-800 mb-1">¡Hola! Soy Clari</h4>
              <p className="text-sm text-gray-500 text-center mb-6">Para brindarte una mejor atención, por favor ingresa tus datos:</p>
              
              <form onSubmit={handleRegister} className="w-full max-w-[300px] space-y-3">
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tu nombre"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                    autoFocus
                  />
                </div>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    placeholder="Tu correo electrónico"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                  />
                </div>
                
                {formError && (
                  <p className="text-xs text-red-500 text-center font-medium">{formError}</p>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-brand-blue hover:bg-brand-blue/90 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                >
                  Comenzar chat <ArrowRight size={16} />
                </button>
              </form>

              <p className="text-[10px] text-gray-400 mt-4 text-center">Tus datos se usan solo para personalizar la atención.</p>
            </div>
          ) : (
            <>
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.length === 0 && !error && (
                  <div className="text-center text-sm text-gray-500 mt-10">
                    <p className="mb-2 font-semibold">¡Hola {userName}! Soy Clari, tu asistente virtual en JRS CARGO.</p>
                    <p>¿En qué te puedo ayudar hoy? (Ej: Tarifas, tiempos, casilleros)</p>
                  </div>
                )}
                
                {messages.map(m => {
                  if (!m.content && m.toolInvocations && m.toolInvocations.length > 0) {
                    // Check if any tool has completed with a result
                    const completedTool = m.toolInvocations.find(
                      (t: { state: string }) => t.state === 'result'
                    );
                    
                    if (completedTool && 'result' in completedTool) {
                      const result = completedTool.result as { success?: boolean; trackingInfo?: { package?: { tracking?: string; statusLabel?: string; weight?: number; description?: string; provider?: string; consignatario?: string }; timeline?: { date?: string; status?: string }[] }; error?: string };
                      
                      if (result.success && result.trackingInfo) {
                        const pkg = result.trackingInfo.package;
                        const timeline = result.trackingInfo.timeline;
                        return (
                          <div key={m.id} className="flex gap-3 justify-start">
                            <div className="w-8 h-8 rounded-full bg-brand-blue flex-shrink-0 flex items-center justify-center text-white">
                              <Bot size={16} />
                            </div>
                            <div className="bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-sm p-4 text-sm shadow-sm max-w-[90%] text-left space-y-2">
                              <p className="font-bold text-brand-blue">📦 Tracking: {pkg?.tracking}</p>
                              <p>Estado: <span className="font-semibold">{pkg?.statusLabel || 'Desconocido'}</span></p>
                              {pkg?.weight && <p>Peso: {pkg.weight} lbs</p>}
                              {pkg?.provider && <p>Proveedor: {pkg.provider}</p>}
                              {pkg?.description && <p>Descripción: {pkg.description}</p>}
                              {timeline && timeline.length > 0 && (
                                <div className="pt-2 border-t border-gray-100">
                                  <p className="font-semibold text-xs text-gray-500 mb-1">Últimos eventos:</p>
                                  {timeline.slice(0, 3).map((evt, i) => (
                                    <p key={i} className="text-xs text-gray-600">
                                      • {evt.status} {evt.date ? '(' + new Date(evt.date).toLocaleDateString('es-CR') + ')' : ''}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      } else if (result.error) {
                        return (
                          <div key={m.id} className="flex gap-3 justify-start">
                            <div className="w-8 h-8 rounded-full bg-brand-blue flex-shrink-0 flex items-center justify-center text-white">
                              <Bot size={16} />
                            </div>
                            <div className="bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-sm p-4 text-sm shadow-sm max-w-[90%] text-center">
                              <p>{result.error}</p>
                            </div>
                          </div>
                        );
                      }
                    }
                    
                    // Still loading
                    return (
                      <div key={m.id} className="flex gap-3 justify-start">
                        <div className="w-8 h-8 rounded-full bg-brand-blue flex-shrink-0 flex items-center justify-center text-white">
                          <Bot size={16} />
                        </div>
                        <div className="bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-sm text-center p-4 text-sm shadow-sm max-w-[90%] flex items-center gap-2">
                          <Loader2 size={16} className="animate-spin text-brand-blue" />
                          <span>Buscando paquete en el sistema...</span>
                        </div>
                      </div>
                    );
                  }

                  if (!m.content) return null;

                  return (
                    <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {m.role !== 'user' && (
                        <div className="w-8 h-8 rounded-full bg-brand-blue flex-shrink-0 flex items-center justify-center text-white">
                          <Bot size={16} />
                        </div>
                      )}
                      <div className={`max-w-[90%] p-4 text-sm shadow-sm ${
                        m.role === 'user' 
                          ? 'bg-brand-blue text-white rounded-2xl rounded-tr-sm text-right' 
                          : 'bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-sm text-center'
                      }`}>
                        <div className="whitespace-pre-wrap leading-relaxed">
                          {m.content.replace(/\*\*/g, '').replace(/###/g, '').replace(/\*/g, '•')}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {error && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-brand-blue flex-shrink-0 flex items-center justify-center text-white">
                      <Bot size={16} />
                    </div>
                    <div className="bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-sm p-4 text-sm shadow-sm max-w-[90%] text-center">
                      <p className="mb-2 font-medium">¡Ups! En este momento estoy experimentando un alto volumen de consultas.</p>
                      <p className="mb-3 text-gray-500">Para una atención inmediata, por favor escríbenos a nuestro WhatsApp oficial:</p>
                      <a 
                        href="https://wa.me/50672601238" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20b858] text-white font-bold py-2 px-5 rounded-full transition-all shadow-md hover:shadow-lg hover:scale-105"
                      >
                        Abrir WhatsApp
                      </a>
                    </div>
                  </div>
                )}
                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-brand-blue flex-shrink-0 flex items-center justify-center text-white">
                      <Bot size={16} />
                    </div>
                    <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm p-4 flex items-center shadow-sm">
                      <Loader2 size={16} className="animate-spin text-brand-blue" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-white border-t border-gray-100">
                <form onSubmit={handleSubmit} className="flex gap-2 relative">
                  <input
                    value={input}
                    onChange={handleInputChange}
                    placeholder="Escribe tu mensaje aquí..."
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-3 text-sm focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                    disabled={isLoading}
                  />
                  <button 
                    type="submit" 
                    disabled={isLoading || !input.trim()}
                    className="w-12 h-12 bg-gradient-to-tr from-brand-yellow to-yellow-400 text-brand-blue rounded-full flex items-center justify-center disabled:opacity-50 disabled:grayscale hover:shadow-lg hover:scale-105 active:scale-95 transition-all flex-shrink-0"
                  >
                    <Send size={20} className="-ml-1" />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      )}

      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-3 transition-transform hover:scale-105"
        >
          <div className="bg-white px-4 py-2 rounded-full shadow-lg border border-gray-100 text-sm font-semibold text-brand-blue opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap hidden sm:flex items-center gap-2">
            <Sparkles size={16} className="text-brand-yellow" />
            Habla con Clari
          </div>
          <motion.div 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="relative group-hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)] transition-shadow rounded-full"
          >
            <AnimatedRobotFace />
          </motion.div>
        </button>
      )}
    </div>
  );
}
