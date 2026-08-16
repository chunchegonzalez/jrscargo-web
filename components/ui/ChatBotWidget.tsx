'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import { 
  X, Send, Bot, Sparkles, 
  Package, DollarSign, MapPin, Clock, MessageCircle, 
  ChevronRight, ExternalLink, RotateCcw, User, Mail, ArrowRight
} from 'lucide-react';
import Image from 'next/image';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';

const AnimatedRobotFace = ({ isHovered = false }: { isHovered?: boolean }) => {
  const faceRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const springConfig = { damping: 20, stiffness: 300, mass: 0.4 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);
  
  const eyeX = useTransform(smoothX, [-1, 1], [-7, 7]);
  const eyeY = useTransform(smoothY, [-1, 1], [-5, 5]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!faceRef.current) return;
      const rect = faceRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const maxDistance = 400;
      const normalizedDist = Math.min(distance / maxDistance, 1);
      
      const angle = Math.atan2(deltaY, deltaX);
      mouseX.set(Math.cos(angle) * normalizedDist);
      mouseY.set(Math.sin(angle) * normalizedDist);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <motion.div 
      animate={isHovered ? { 
        y: [0, -8, -3, -6, -4],
        rotate: [0, -6, 6, -3, 3, 0],
        scale: [1, 1.12, 1.08]
      } : { 
        y: 0, 
        rotate: 0,
        scale: 1 
      }}
      transition={isHovered ? {
        duration: 1.2,
        repeat: Infinity,
        repeatType: "reverse",
        ease: "easeInOut"
      } : {
        duration: 0.25,
        ease: "easeOut"
      }}
      ref={faceRef} 
      className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-b from-gray-50 to-gray-200 shadow-[0_10px_35px_rgba(0,0,0,0.3)] flex items-center justify-center relative overflow-hidden border-2 border-white"
    >
      {/* Outer Multi-color Halo Ring - Accelerates on Hover */}
      <motion.div 
        animate={{ rotate: 360, scale: isHovered ? 1.3 : 1.05 }}
        transition={{ 
          rotate: { duration: isHovered ? 1.8 : 6, repeat: Infinity, ease: "linear" },
          scale: { duration: 0.3 }
        }}
        className="absolute w-[150%] h-[150%] bg-[conic-gradient(from_0deg,transparent,#12435E,#F9B233,#ED3B4A,transparent)] opacity-95"
      />
      
      <div className="absolute inset-1 rounded-full bg-white z-0"></div>
      
      {/* Inner Visor */}
      <div className="absolute w-[78%] h-[62%] bg-gradient-to-b from-gray-900 to-black rounded-[2rem] flex items-center justify-center gap-2 shadow-inner overflow-hidden border border-gray-700/40 z-10">
        <div className="absolute top-0 left-1/4 right-1/4 h-1/2 bg-gradient-to-b from-white/25 to-transparent rounded-full blur-[1px]"></div>
        
        {/* Animated Eyes */}
        <motion.div style={{ x: eyeX, y: eyeY }} className="flex gap-2 relative z-10">
          {/* Left Eye */}
          <motion.div 
            animate={isHovered ? {
              scaleY: [1, 0.15, 1.2, 0.9, 1.1],
              scaleX: [1, 1.1, 0.9, 1.1, 1],
            } : {
              scaleY: [1, 0.1, 1, 1, 1],
              scaleX: 1
            }}
            transition={isHovered ? {
              duration: 1.2,
              repeat: Infinity,
              times: [0, 0.1, 0.3, 0.6, 1]
            } : {
              duration: 3.5,
              repeat: Infinity,
              times: [0, 0.05, 0.1, 0.5, 1]
            }}
            className={`w-2.5 h-3.5 bg-brand-yellow rounded-full transition-all duration-300 ${
              isHovered ? 'shadow-[0_0_14px_rgba(249,178,51,1)] bg-amber-300' : 'shadow-[0_0_8px_rgba(249,178,51,0.9)]'
            }`}
          />
          {/* Right Eye */}
          <motion.div 
            animate={isHovered ? {
              scaleY: [1, 0.15, 1.2, 0.9, 1.1],
              scaleX: [1, 1.1, 0.9, 1.1, 1],
            } : {
              scaleY: [1, 0.1, 1, 1, 1],
              scaleX: 1
            }}
            transition={isHovered ? {
              duration: 1.2,
              repeat: Infinity,
              times: [0, 0.1, 0.3, 0.6, 1]
            } : {
              duration: 3.5,
              repeat: Infinity,
              times: [0, 0.05, 0.1, 0.5, 1]
            }}
            className={`w-2.5 h-3.5 bg-brand-yellow rounded-full transition-all duration-300 ${
              isHovered ? 'shadow-[0_0_14px_rgba(249,178,51,1)] bg-amber-300' : 'shadow-[0_0_8px_rgba(249,178,51,0.9)]'
            }`}
          />
        </motion.div>
      </div>
    </motion.div>
  );
};

const QUICK_ACTIONS = [
  { id: 'tarifas', label: 'Tarifas y Precios', icon: DollarSign, query: '¿Cuáles son las tarifas aéreas y marítimas?' },
  { id: 'tracking', label: 'Rastrear mi paquete', icon: Package, query: 'Quiero rastrear un paquete' },
  { id: 'casillero', label: 'Dirección de Casillero', icon: MapPin, query: '¿Cuál es la dirección del casillero en Miami y cómo registrarme?' },
  { id: 'tiempos', label: 'Tiempos de entrega', icon: Clock, query: '¿Cuánto tiempo tardan los envíos a Costa Rica?' },
];

export default function ChatBotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isTriggerHovered, setIsTriggerHovered] = useState(false);

  // User details for Bot Leads in Admin Panel
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);

  const { messages, input, handleInputChange, handleSubmit, setInput, isLoading, error, setMessages } = useChat({
    maxSteps: 4,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedName = localStorage.getItem('clari_lead_name');
      const savedEmail = localStorage.getItem('clari_lead_email');
      if (savedName && savedEmail) {
        setUserName(savedName);
        setUserEmail(savedEmail);
        setIsRegistered(true);
      }
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    const trimmedName = userName.trim();
    const trimmedEmail = userEmail.trim().toLowerCase();

    if (!trimmedName) {
      setRegisterError('Por favor ingresa tu nombre');
      return;
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setRegisterError('Por favor ingresa un correo válido');
      return;
    }

    try {
      setIsSubmittingLead(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('clari_lead_name', trimmedName);
        localStorage.setItem('clari_lead_email', trimmedEmail);
      }
      setIsRegistered(true);

      // Send to Admin Panel (bot-leads)
      await fetch('/api/bot-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          message: 'Inicio de chat en sitio web'
        })
      });
    } catch (err) {
      console.error('Error saving lead:', err);
      setIsRegistered(true);
    } finally {
      setIsSubmittingLead(false);
    }
  };

  const handleQuickAction = (queryText: string) => {
    setInput(queryText);
    setTimeout(() => {
      const fakeEvent = new Event('submit', { cancelable: true }) as unknown as React.FormEvent<HTMLFormElement>;
      handleSubmit(fakeEvent);
    }, 50);
  };

  const handleReset = () => {
    setMessages([]);
    setInput('');
  };

  // Formatter for rich text rendering
  const renderMessageContent = (content: string) => {
    const lines = content.split('\n');
    return (
      <div className="space-y-1.5 text-[13px] leading-relaxed">
        {lines.map((line, idx) => {
          if (!line.trim()) return <div key={idx} className="h-1" />;

          // Render Tracking CTA Button
          const trackingLinkMatch = line.match(/(?:https?:\/\/)?(?:www\.)?jrscargocr\.com\/tracking\?number=([A-Za-z0-9_-]+)/i) ||
                                    line.match(/\/tracking\?number=([A-Za-z0-9_-]+)/i);
          if (trackingLinkMatch) {
            const trkNumber = trackingLinkMatch[1];
            return (
              <div key={idx} className="my-2.5">
                <a
                  href={`/tracking?number=${encodeURIComponent(trkNumber)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-blue text-white font-bold rounded-xl text-xs hover:bg-brand-blue/90 hover:shadow-md transition-all active:scale-95"
                >
                  <Package size={15} className="text-brand-yellow" />
                  <span>Ver Seguimiento en Vivo ({trkNumber})</span>
                  <ExternalLink size={13} className="opacity-80" />
                </a>
              </div>
            );
          }

          // Highlight specific CTA links
          if (line.includes('worldboxcr.com/jrscargo/register')) {
            return (
              <div key={idx} className="my-2">
                <a
                  href="https://worldboxcr.com/jrscargo/register"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-brand-yellow text-brand-blue font-bold rounded-xl text-xs hover:bg-brand-yellow/90 transition-transform active:scale-95 shadow-sm"
                >
                  <ExternalLink size={14} /> Abrir Casillero Gratis
                </a>
              </div>
            );
          }

          if (line.includes('wa.me/50672601238') || line.includes('+506 7260 1238')) {
            return (
              <div key={idx} className="my-2">
                <a
                  href="https://wa.me/50672601238"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#25D366] text-white font-bold rounded-xl text-xs hover:bg-[#20b858] transition-transform active:scale-95 shadow-sm"
                >
                  <MessageCircle size={14} /> Contactar por WhatsApp
                </a>
              </div>
            );
          }

          // Parse markdown-like bold *text* and auto-link standard URLs
          let formattedLine = line.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
          formattedLine = formattedLine.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-brand-blue underline font-bold hover:text-brand-yellow transition-colors">$1</a>');

          return (
            <p 
              key={idx} 
              dangerouslySetInnerHTML={{ __html: formattedLine }} 
              className={line.startsWith('•') ? 'pl-2 text-gray-700 font-medium' : ''}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="mb-3 w-[calc(100vw-2.5rem)] sm:w-[410px] h-[78vh] sm:h-[580px] max-h-[660px] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-gray-100"
          >
            {/* Header */}
            <div className="bg-[#0B1D2B] p-4 text-white flex justify-between items-center relative overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-yellow/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center gap-3 relative z-10">
                <div className="relative">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 p-1 flex items-center justify-center">
                    <Image src="/logo.png" alt="JRS Cargo" width={28} height={28} className="object-contain" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-[#0B1D2B] rounded-full animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-black text-sm tracking-tight text-white">Clari</h3>
                    <span className="text-[10px] px-1.5 py-0.2 bg-brand-yellow/20 text-brand-yellow rounded font-bold uppercase tracking-wider">AI</span>
                  </div>
                  <p className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span> Asistente Oficial JRS
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 relative z-10">
                <a
                  href="https://wa.me/50672601238"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-400 hover:text-green-400 hover:bg-white/10 rounded-xl transition-colors"
                  title="Abrir WhatsApp oficial"
                >
                  <MessageCircle size={18} />
                </a>
                {messages.length > 0 && (
                  <button
                    onClick={handleReset}
                    className="p-2 text-gray-400 hover:text-brand-yellow hover:bg-white/10 rounded-xl transition-colors"
                    title="Reiniciar chat"
                  >
                    <RotateCcw size={16} />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                  title="Cerrar chat"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Chat Conversation Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/70">
              
              {/* Lead Registration Form Gate if not registered */}
              {!isRegistered && messages.length === 0 && (
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm text-left animate-fade-in space-y-3">
                  <div className="flex items-center gap-2 text-brand-blue font-black text-sm">
                    <Sparkles size={16} className="text-brand-yellow" />
                    ¡Bienvenido a JRS CARGO!
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Soy <strong>Clari</strong>. Para brindarte una atención rápida y registrar tu consulta en el sistema, por favor indícanos tus datos:
                  </p>

                  <form onSubmit={handleRegisterSubmit} className="space-y-2.5 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 mb-1">Nombre Completo</label>
                      <div className="relative">
                        <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          required
                          placeholder="Ej. Carlos Mora"
                          value={userName}
                          onChange={(e) => setUserName(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-brand-blue focus:bg-white transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 mb-1">Correo Electrónico</label>
                      <div className="relative">
                        <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="email"
                          required
                          placeholder="Ej. carlos@gmail.com"
                          value={userEmail}
                          onChange={(e) => setUserEmail(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-brand-blue focus:bg-white transition-all"
                        />
                      </div>
                    </div>

                    {registerError && (
                      <p className="text-[11px] text-red-600 font-semibold">{registerError}</p>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmittingLead}
                      className="w-full mt-1 py-2.5 bg-brand-blue hover:bg-brand-blue/95 active:scale-[0.98] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
                    >
                      <span>{isSubmittingLead ? 'Conectando...' : 'Iniciar Atención'}</span>
                      <ArrowRight size={14} />
                    </button>
                  </form>
                </div>
              )}

              {/* Welcome Presentation Card (When Registered) */}
              {isRegistered && messages.length === 0 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-left">
                    <div className="flex items-center gap-2 text-brand-blue font-bold text-xs mb-1">
                      <Sparkles size={14} className="text-brand-yellow" />
                      ¡Hola, {userName.split(' ')[0]}!
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed mb-3">
                      Te puedo orientar sobre tarifas aéreas ($7/lb), marítimas ($30/ft³), abrir tu casillero o rastrear tus paquetes en tiempo real.
                    </p>
                    <div className="pt-2 border-t border-gray-50 flex items-center justify-between text-[11px] text-gray-400">
                      <span>⚡ Respuesta inmediata</span>
                      <span className="font-bold text-brand-blue">Miami • España • China</span>
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1 mb-2">Preguntas frecuentes:</p>
                    <div className="grid grid-cols-1 gap-2">
                      {QUICK_ACTIONS.map(action => {
                        const Icon = action.icon;
                        return (
                          <button
                            key={action.id}
                            onClick={() => handleQuickAction(action.query)}
                            className="w-full text-left p-3 rounded-2xl bg-white hover:bg-brand-blue/5 border border-gray-100 hover:border-brand-blue/20 flex items-center justify-between transition-all group shadow-sm hover:shadow"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-xl bg-brand-blue/5 text-brand-blue group-hover:bg-brand-blue group-hover:text-white flex items-center justify-center transition-colors">
                                <Icon size={14} />
                              </div>
                              <span className="text-xs font-bold text-gray-700 group-hover:text-brand-blue transition-colors">
                                {action.label}
                              </span>
                            </div>
                            <ChevronRight size={14} className="text-gray-400 group-hover:text-brand-blue group-hover:translate-x-0.5 transition-all" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Message List */}
              {messages.map((m) => {
                const isUser = m.role === 'user';
                return (
                  <div key={m.id} className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                    {!isUser && (
                      <div className="w-7 h-7 rounded-xl bg-[#0B1D2B] text-brand-yellow flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                        <Bot size={14} />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] p-3.5 rounded-2xl shadow-sm text-left ${
                        isUser
                          ? 'bg-brand-blue text-white rounded-tr-sm font-medium text-xs'
                          : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'
                      }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      ) : (
                        renderMessageContent(m.content)
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Typing Loader */}
              {isLoading && (
                <div className="flex gap-2.5 justify-start animate-fade-in">
                  <div className="w-7 h-7 rounded-xl bg-[#0B1D2B] text-brand-yellow flex items-center justify-center shrink-0">
                    <Bot size={14} />
                  </div>
                  <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm p-3.5 shadow-sm flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-brand-blue rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 bg-brand-blue rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 bg-brand-blue rounded-full animate-bounce" />
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-2xl text-xs text-center border border-red-100">
                  <p className="font-bold mb-1">Estamos experimentando una alta demanda.</p>
                  <p>Por favor contáctanos directamente a nuestro <a href="https://wa.me/50672601238" target="_blank" rel="noopener noreferrer" className="font-bold underline text-green-700">WhatsApp Oficial (+506 7260 1238)</a>.</p>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Pills Bar when conversation is active */}
            {messages.length > 0 && (
              <div className="px-3 py-1.5 bg-white border-t border-gray-100 flex items-center gap-1.5 overflow-x-auto scrollbar-hide shrink-0">
                <button
                  onClick={() => handleQuickAction('¿Cuáles son las tarifas aéreas y marítimas?')}
                  className="px-2.5 py-1 rounded-full bg-gray-100 hover:bg-brand-blue/10 text-gray-700 hover:text-brand-blue text-[11px] font-semibold whitespace-nowrap transition-colors"
                >
                  💰 Tarifas
                </button>
                <button
                  onClick={() => handleQuickAction('¿Cómo abro un casillero en Miami?')}
                  className="px-2.5 py-1 rounded-full bg-gray-100 hover:bg-brand-blue/10 text-gray-700 hover:text-brand-blue text-[11px] font-semibold whitespace-nowrap transition-colors"
                >
                  🏢 Casillero Miami
                </button>
                <button
                  onClick={() => handleQuickAction('¿Cuánto tiempo tardan los envíos?')}
                  className="px-2.5 py-1 rounded-full bg-gray-100 hover:bg-brand-blue/10 text-gray-700 hover:text-brand-blue text-[11px] font-semibold whitespace-nowrap transition-colors"
                >
                  ⏱️ Tiempos
                </button>
                <a
                  href="https://wa.me/50672601238"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-full bg-green-50 hover:bg-green-100 text-green-700 text-[11px] font-semibold whitespace-nowrap transition-colors flex items-center gap-1"
                >
                  <MessageCircle size={12} /> WhatsApp
                </a>
              </div>
            )}

            {/* Input Bar */}
            <div className="p-3.5 bg-white border-t border-gray-100 shrink-0">
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Escribe tu consulta o número de tracking..."
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="w-10 h-10 rounded-2xl bg-brand-blue hover:bg-brand-blue/90 disabled:opacity-40 text-white flex items-center justify-center shadow-md hover:shadow-lg transition-all active:scale-95 shrink-0"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          onMouseEnter={() => setIsTriggerHovered(true)}
          onMouseLeave={() => setIsTriggerHovered(false)}
          className="group flex items-center gap-3 transition-transform focus:outline-none"
          aria-label="Abrir asistente Clari"
        >
          <motion.div
            animate={isTriggerHovered ? { opacity: 1, x: 0, scale: 1 } : { opacity: 0, x: 8, scale: 0.92 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="bg-[#0B1D2B] text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-white/10 text-xs font-bold whitespace-nowrap hidden sm:flex items-center gap-2 pointer-events-none"
          >
            <Sparkles size={14} className="text-brand-yellow animate-spin" />
            <span>👋 ¡Hola! Habla con <strong className="text-brand-yellow font-black">Clari</strong></span>
          </motion.div>

          <motion.div
            whileTap={{ scale: 0.92 }}
            className="relative cursor-pointer"
          >
            <AnimatedRobotFace isHovered={isTriggerHovered} />
          </motion.div>
        </button>
      )}
    </div>
  );
}
