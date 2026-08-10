'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import { X, Send, Bot, Loader2, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

const AnimatedRobotFace = () => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  // Smooth out the mouse movement
  const springConfig = { damping: 25, stiffness: 250, mass: 0.5 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);
  
  // Map mouse position to eye offset
  const eyeX = useTransform(smoothX, [-0.5, 0.5], [-4, 4]);
  const eyeY = useTransform(smoothY, [-0.5, 0.5], [-3, 3]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse position between -0.5 and 0.5 based on window size
      const x = (e.clientX / window.innerWidth) - 0.5;
      const y = (e.clientY / window.innerHeight) - 0.5;
      mouseX.set(x);
      mouseY.set(y);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <div className="w-16 h-16 rounded-full bg-gradient-to-b from-gray-50 to-gray-200 shadow-[0_8px_30px_rgba(0,0,0,0.2)] flex items-center justify-center relative overflow-hidden border border-white">
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
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, error]);

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

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.length === 0 && !error && (
              <div className="text-center text-sm text-gray-500 mt-10">
                <p className="mb-2 font-semibold">¡Hola! Soy Clari, tu asistente virtual en JRS CARGO.</p>
                <p>¿En qué te puedo ayudar hoy? (Ej: Tarifas, tiempos, casilleros)</p>
              </div>
            )}
            
            {messages.map(m => (
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
            ))}
            
            {error && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-red-500 flex-shrink-0 flex items-center justify-center text-white">
                  <X size={16} />
                </div>
                <div className="bg-red-50 border border-red-100 text-red-700 rounded-2xl rounded-tl-sm p-3 text-sm shadow-sm max-w-[85%]">
                  Hubo un error de conexión: {error.message}
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
