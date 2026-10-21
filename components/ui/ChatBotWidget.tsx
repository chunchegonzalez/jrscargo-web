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
import { useLanguage } from '@/context/LanguageContext';
import { useHalloween } from '@/components/ui/HalloweenProvider';
import { HalloweenWitchHat } from '@/components/ui/HalloweenIcons';

const AnimatedRobotFace = ({
  isHovered = false,
  isPatriotic = false,
  isHalloween = false,
}: {
  isHovered?: boolean;
  isPatriotic?: boolean;
  isHalloween?: boolean;
}) => {
  const faceRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 18, stiffness: 320, mass: 0.38 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  // Expressive multi-layer parallax mouse tracking
  const headX = useTransform(smoothX, [-1, 1], [-4.5, 4.5]);
  const headY = useTransform(smoothY, [-1, 1], [-3.5, 3.5]);
  const headRotate = useTransform(smoothX, [-1, 1], [-7, 7]);

  const visorX = useTransform(smoothX, [-1, 1], [-3, 3]);
  const visorY = useTransform(smoothY, [-1, 1], [-2.5, 2.5]);

  const eyeX = useTransform(smoothX, [-1, 1], [-8.5, 8.5]);
  const eyeY = useTransform(smoothY, [-1, 1], [-5.5, 5.5]);
  const pupilX = useTransform(smoothX, [-1, 1], [-3, 3]);
  const pupilY = useTransform(smoothY, [-1, 1], [-2, 2]);

  // Witch hat & skeleton details react to mouse position
  const hatX = useTransform(smoothX, [-1, 1], [-6, 6]);
  const hatY = useTransform(smoothY, [-1, 1], [-3, 2]);
  const hatRotate = useTransform(smoothX, [-1, 1], [2, 18]);
  const jawY = useTransform(smoothY, [-1, 1], [0, 3.5]);
  const leftHandY = useTransform(smoothY, [-1, 1], [-3, 3]);
  const rightHandY = useTransform(smoothY, [-1, 1], [3, -3]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!faceRef.current) return;
      const rect = faceRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const maxDistance = 750;
      const normalizedDist = Math.min(distance / maxDistance, 1);

      const angle = Math.atan2(deltaY, deltaX);
      mouseX.set(Math.cos(angle) * normalizedDist);
      mouseY.set(Math.sin(angle) * normalizedDist);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  // Edición 3D Mes Patrio (Costa Rica 🇨🇷) hasta el 20 de Septiembre
  if (isPatriotic) {
    return (
      <motion.div
        ref={faceRef}
        animate={isHovered ? {
          y: [0, -7, -2, -6, 0],
          rotate: [0, -5, 5, -3, 0],
          scale: 1.12,
        } : {
          y: [0, -3.5, 0],
          rotate: [0, 1.8, -1.8, 0],
          scale: 1,
        }}
        transition={isHovered ? {
          duration: 0.9,
          repeat: Infinity,
          ease: "easeInOut",
        } : {
          duration: 3.2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="w-[74px] h-[74px] sm:w-[82px] sm:h-[82px] flex items-center justify-center relative filter drop-shadow-[0_10px_22px_rgba(0,0,0,0.25)] select-none"
      >
        <Image
          src="/bot-patrio.png"
          alt="Clari AI - Costa Rica Mes Patrio"
          width={160}
          height={140}
          className="w-full h-full object-contain pointer-events-none"
          priority
        />
      </motion.div>
    );
  }

  // Versión Estándar + Edición Especial Skeleton-Bot de Halloween 🎃💀
  return (
    <motion.div
      ref={faceRef}
      style={{ x: headX, y: headY, rotate: headRotate }}
      animate={isHovered ? {
        y: [0, -8, -3, -6, 0],
        scale: [1, 1.13, 1.08, 1.12, 1],
      } : {
        y: [0, -2.5, 0],
        scale: 1,
      }}
      transition={isHovered ? {
        duration: 1.1,
        repeat: Infinity,
        ease: "easeInOut",
      } : {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className="relative flex items-center justify-center select-none"
    >
      {/* 1. Interactive Witch Hat perched seamlessly on the head (moves with mouse & hover) */}
      {isHalloween && (
        <motion.div
          style={{ x: hatX, y: hatY, rotate: hatRotate }}
          animate={isHovered ? {
            y: [-2, -9, -3, -7, -2],
            scale: [1, 1.08, 1],
          } : {
            y: [0, -2, 0],
            scale: 1,
          }}
          transition={{
            duration: isHovered ? 0.9 : 2.6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -top-8 sm:-top-9 left-1/2 -translate-x-[44%] z-30 pointer-events-none"
        >
          <HalloweenWitchHat size={58} />
        </motion.div>
      )}

      {/* 2. Left & Right Articulated Bony Skeleton Hands gripping the bot sides */}
      {isHalloween && (
        <>
          {/* Left Skeleton Hand */}
          <motion.div
            style={{ y: leftHandY }}
            animate={isHovered ? {
              x: [-2, -6, -1, -5, -2],
              rotate: [-12, -28, -5, -22, -12],
            } : {
              x: [0, -1.5, 0],
              rotate: [-6, -12, -6],
            }}
            transition={{ duration: isHovered ? 0.7 : 2.4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -left-3.5 sm:-left-4 top-1/2 -translate-y-1/2 z-20 pointer-events-none drop-shadow-[0_3px_6px_rgba(0,0,0,0.45)]"
          >
            <svg width="20" height="24" viewBox="0 0 20 24" fill="none" aria-hidden="true">
              <rect x="2" y="6" width="6" height="12" rx="3" fill="#F8FAFC" stroke="#475569" strokeWidth="1.2" />
              <rect x="6" y="4" width="11" height="4" rx="2" fill="#FFFFFF" stroke="#475569" strokeWidth="1.1" />
              <rect x="7" y="10" width="11" height="4" rx="2" fill="#FFFFFF" stroke="#475569" strokeWidth="1.1" />
              <rect x="6" y="16" width="10" height="4" rx="2" fill="#FFFFFF" stroke="#475569" strokeWidth="1.1" />
            </svg>
          </motion.div>

          {/* Right Skeleton Hand */}
          <motion.div
            style={{ y: rightHandY }}
            animate={isHovered ? {
              x: [2, 6, 1, 5, 2],
              rotate: [12, 28, 5, 22, 12],
            } : {
              x: [0, 1.5, 0],
              rotate: [6, 12, 6],
            }}
            transition={{ duration: isHovered ? 0.7 : 2.4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -right-3.5 sm:-right-4 top-1/2 -translate-y-1/2 z-20 pointer-events-none drop-shadow-[0_3px_6px_rgba(0,0,0,0.45)]"
          >
            <svg width="20" height="24" viewBox="0 0 20 24" fill="none" aria-hidden="true">
              <rect x="12" y="6" width="6" height="12" rx="3" fill="#F8FAFC" stroke="#475569" strokeWidth="1.2" />
              <rect x="3" y="4" width="11" height="4" rx="2" fill="#FFFFFF" stroke="#475569" strokeWidth="1.1" />
              <rect x="2" y="10" width="11" height="4" rx="2" fill="#FFFFFF" stroke="#475569" strokeWidth="1.1" />
              <rect x="4" y="16" width="10" height="4" rx="2" fill="#FFFFFF" stroke="#475569" strokeWidth="1.1" />
            </svg>
          </motion.div>
        </>
      )}

      {/* 3. Main Circular Robot / Skeleton Cranium Shell */}
      <div
        className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center relative overflow-hidden border-2 ${
          isHalloween
            ? 'bg-gradient-to-b from-white via-slate-50 to-slate-200 border-orange-300/90 shadow-[0_10px_35px_rgba(249,115,22,0.45)]'
            : 'bg-gradient-to-b from-gray-50 to-gray-200 border-white shadow-[0_10px_35px_rgba(0,0,0,0.3)]'
        }`}
      >
        {/* Outer Multi-color Halo Ring - Accelerates on Hover */}
        <motion.div
          animate={{ rotate: 360, scale: isHovered ? 1.3 : 1.05 }}
          transition={{
            rotate: { duration: isHovered ? 1.6 : 5.5, repeat: Infinity, ease: "linear" },
            scale: { duration: 0.3 },
          }}
          className={`absolute w-[150%] h-[150%] opacity-95 ${
            isHalloween
              ? 'bg-[conic-gradient(from_0deg,transparent,#F97316,#A855F7,#FBBF24,#EF4444,transparent)]'
              : 'bg-[conic-gradient(from_0deg,transparent,#12435E,#F9B233,#ED3B4A,transparent)]'
          }`}
        />

        {/* Bone-white / Pearl Inner Skull Face */}
        <div
          className={`absolute inset-1 rounded-full z-0 ${
            isHalloween
              ? 'bg-gradient-to-b from-[#FFFFFF] via-[#F8FAFC] to-[#E2E8F0]'
              : 'bg-white'
          }`}
        >
          {/* Subtle stitched skull-suture detail on forehead when Halloween is active */}
          {isHalloween && (
            <svg
              viewBox="0 0 60 20"
              className="w-full h-4 opacity-45 pointer-events-none"
              fill="none"
            >
              <path
                d="M18 6 Q30 11 42 6"
                stroke="#64748B"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <line x1="24" y1="5" x2="23" y2="9" stroke="#64748B" strokeWidth="1.1" strokeLinecap="round" />
              <line x1="30" y1="6" x2="30" y2="10.5" stroke="#64748B" strokeWidth="1.1" strokeLinecap="round" />
              <line x1="36" y1="5" x2="37" y2="9" stroke="#64748B" strokeWidth="1.1" strokeLinecap="round" />
            </svg>
          )}
        </div>

        {/* Inner Visor (shifts subtly with mouse) */}
        <motion.div
          style={{ x: visorX, y: visorY }}
          className={`absolute w-[80%] h-[60%] rounded-[2rem] flex items-center justify-center gap-2.5 shadow-inner overflow-hidden z-10 ${
            isHalloween
              ? 'bg-gradient-to-b from-[#130722] via-[#090414] to-black border border-purple-500/40 -mt-1'
              : 'bg-gradient-to-b from-gray-900 to-black border border-gray-700/40'
          }`}
        >
          <div className="absolute top-0 left-1/4 right-1/4 h-1/2 bg-gradient-to-b from-white/25 to-transparent rounded-full blur-[1px]" />

          {/* Animated Mouse-Tracking Eyes */}
          <motion.div style={{ x: eyeX, y: eyeY }} className="flex items-center gap-2.5 relative z-10">
            {/* Left Eye */}
            <motion.div
              animate={isHovered ? {
                scaleY: [1, 0.15, 1.22, 0.92, 1.1],
                scaleX: [1, 1.12, 0.92, 1.1, 1],
              } : {
                scaleY: [1, 0.1, 1, 1, 1],
                scaleX: 1,
              }}
              transition={isHovered ? {
                duration: 1.1,
                repeat: Infinity,
                times: [0, 0.1, 0.3, 0.6, 1],
              } : {
                duration: 3.5,
                repeat: Infinity,
                times: [0, 0.05, 0.1, 0.5, 1],
              }}
              className={`w-3 h-3.5 rounded-full flex items-center justify-center transition-colors duration-300 ${
                isHalloween
                  ? isHovered
                    ? 'bg-gradient-to-t from-orange-600 via-amber-400 to-yellow-200 shadow-[0_0_16px_rgba(249,115,22,1)]'
                    : 'bg-gradient-to-t from-orange-500 via-amber-400 to-yellow-300 shadow-[0_0_10px_rgba(249,115,22,0.95)]'
                  : isHovered
                    ? 'bg-amber-300 shadow-[0_0_14px_rgba(249,178,51,1)]'
                    : 'bg-brand-yellow shadow-[0_0_8px_rgba(249,178,51,0.9)]'
              }`}
            >
              {/* Inner cursor-tracking pupil */}
              <motion.div
                style={{ x: pupilX, y: pupilY }}
                className={`w-1.5 h-1.5 rounded-full ${
                  isHalloween ? 'bg-white shadow-[0_0_4px_#FFF]' : 'bg-white/90'
                }`}
              />
            </motion.div>

            {/* Tiny glowing skull nasal cavity triangle in Halloween mode */}
            {isHalloween && (
              <div
                className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[5px] border-b-purple-400/80 mt-2 opacity-90"
                aria-hidden="true"
              />
            )}

            {/* Right Eye */}
            <motion.div
              animate={isHovered ? {
                scaleY: [1, 0.15, 1.22, 0.92, 1.1],
                scaleX: [1, 1.12, 0.92, 1.1, 1],
              } : {
                scaleY: [1, 0.1, 1, 1, 1],
                scaleX: 1,
              }}
              transition={isHovered ? {
                duration: 1.1,
                repeat: Infinity,
                times: [0, 0.1, 0.3, 0.6, 1],
              } : {
                duration: 3.5,
                repeat: Infinity,
                times: [0, 0.05, 0.1, 0.5, 1],
              }}
              className={`w-3 h-3.5 rounded-full flex items-center justify-center transition-colors duration-300 ${
                isHalloween
                  ? isHovered
                    ? 'bg-gradient-to-t from-orange-600 via-amber-400 to-yellow-200 shadow-[0_0_16px_rgba(249,115,22,1)]'
                    : 'bg-gradient-to-t from-orange-500 via-amber-400 to-yellow-300 shadow-[0_0_10px_rgba(249,115,22,0.95)]'
                  : isHovered
                    ? 'bg-amber-300 shadow-[0_0_14px_rgba(249,178,51,1)]'
                    : 'bg-brand-yellow shadow-[0_0_8px_rgba(249,178,51,0.9)]'
              }`}
            >
              {/* Inner cursor-tracking pupil */}
              <motion.div
                style={{ x: pupilX, y: pupilY }}
                className={`w-1.5 h-1.5 rounded-full ${
                  isHalloween ? 'bg-white shadow-[0_0_4px_#FFF]' : 'bg-white/90'
                }`}
              />
            </motion.div>
          </motion.div>
        </motion.div>

        {/* 4. Articulated Chattering Skeleton Jaw & Teeth at the bottom of the head */}
        {isHalloween && (
          <motion.div
            style={{ y: jawY }}
            animate={isHovered ? {
              y: [0, 2.5, 0, 2, 0],
            } : {
              y: [0, 1, 0],
            }}
            transition={{
              duration: isHovered ? 0.45 : 2.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute bottom-1 z-20 flex items-center justify-center pointer-events-none"
          >
            <div className="flex items-center gap-[1.5px] bg-slate-900/90 px-1.5 py-[1.5px] rounded-full border border-slate-400/60 shadow-xs">
              <span className="w-1 h-1.5 bg-white rounded-[1px]" />
              <span className="w-1 h-2 bg-white rounded-[1px]" />
              <span className="w-1 h-2 bg-white rounded-[1px]" />
              <span className="w-1 h-1.5 bg-white rounded-[1px]" />
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default function ChatBotWidget() {
  const { t, language } = useLanguage();
  const isEn = language === 'en';
  const { isHalloween } = useHalloween();

  const [isOpen, setIsOpen] = useState(false);
  const [isTriggerHovered, setIsTriggerHovered] = useState(false);
  const [isPatriotic, setIsPatriotic] = useState(false);

  // User details for Bot Leads in Admin Panel
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);

  const quickActions = [
    { id: 'tarifas', label: t.chat.faqRates, icon: DollarSign, query: t.chat.faqRatesQuery },
    { id: 'tracking', label: t.chat.faqTracking, icon: Package, query: t.chat.faqTrackingQuery },
    { id: 'casillero', label: t.chat.faqLocker, icon: MapPin, query: t.chat.faqLockerQuery },
    { id: 'tiempos', label: t.chat.faqTimes, icon: Clock, query: t.chat.faqTimesQuery },
  ];

  const { messages, input, handleInputChange, handleSubmit, setInput, isLoading, error, setMessages } = useChat({
    maxSteps: 4,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Mes patrio activo hasta el 20 de septiembre inclusive (mes 8 = Septiembre)
    const now = new Date();
    if (now.getMonth() === 8 && now.getDate() <= 20) {
      setIsPatriotic(true);
    }

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
      setRegisterError(isEn ? 'Please enter your name' : 'Por favor ingresa tu nombre');
      return;
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setRegisterError(isEn ? 'Please enter a valid email' : 'Por favor ingresa un correo válido');
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
                  <span>{isEn ? `View Live Tracking (${trkNumber})` : `Ver Seguimiento en Vivo (${trkNumber})`}</span>
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
                  <ExternalLink size={14} /> {t.footer.createLocker}
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
                  <MessageCircle size={14} /> {isEn ? 'Contact on WhatsApp' : 'Contactar por WhatsApp'}
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
                    <Image 
                      src={isPatriotic ? "/logo-patrio-clean.png" : "/logo.png"} 
                      alt="JRS Cargo" 
                      width={28} 
                      height={28} 
                      className="object-contain" 
                    />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-[#0B1D2B] rounded-full animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-black text-sm tracking-tight text-white flex items-center gap-1">
                      {t.chat.title} {isPatriotic && '🇨🇷'}
                    </h3>
                    <span className="text-[10px] px-1.5 py-0.2 bg-brand-yellow/20 text-brand-yellow rounded font-bold uppercase tracking-wider">AI</span>
                  </div>
                  <p className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span> {t.chat.subtitle} {isPatriotic && '• ¡Mes Patrio!'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 relative z-10">
                <a
                  href="https://wa.me/50672601238"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-400 hover:text-green-400 hover:bg-white/10 rounded-xl transition-colors"
                  title="WhatsApp"
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
                    {isEn ? 'Welcome to JRS CARGO!' : '¡Bienvenido a JRS CARGO!'}
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {isEn 
                      ? "I'm Clari. To provide you with fast guidance and register your inquiry, please provide your details:" 
                      : "Soy Clari. Para brindarte una atención rápida y registrar tu consulta en el sistema, por favor indícanos tus datos:"}
                  </p>

                  <form onSubmit={handleRegisterSubmit} className="space-y-2.5 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 mb-1">{isEn ? 'Full Name' : 'Nombre Completo'}</label>
                      <div className="relative">
                        <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          required
                          placeholder={isEn ? "E.g. John Doe" : "Ej. Carlos Mora"}
                          value={userName}
                          onChange={(e) => setUserName(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-brand-blue focus:bg-white transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 mb-1">{isEn ? 'Email Address' : 'Correo Electrónico'}</label>
                      <div className="relative">
                        <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="email"
                          required
                          placeholder={isEn ? "E.g. john@gmail.com" : "Ej. carlos@gmail.com"}
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
                      <span>{isSubmittingLead ? (isEn ? 'Connecting...' : 'Conectando...') : (isEn ? 'Start Chat' : 'Iniciar Atención')}</span>
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
                      {isEn ? `Hello, ${userName.split(' ')[0]}!` : `¡Hola, ${userName.split(' ')[0]}!`}
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed mb-3">
                      {t.chat.greetingDesc}
                    </p>
                    <div className="pt-2 border-t border-gray-50 flex items-center justify-between text-[11px] text-gray-400">
                      <span>{isEn ? '⚡ Instant response' : '⚡ Respuesta inmediata'}</span>
                      <span className="font-bold text-brand-blue">Miami • España • China</span>
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1 mb-2">{t.chat.faqTitle}</p>
                    <div className="grid grid-cols-1 gap-2">
                      {quickActions.map(action => {
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
                  <p className="font-bold mb-1">{isEn ? 'We are experiencing high demand.' : 'Estamos experimentando una alta demanda.'}</p>
                  <p>{isEn ? 'Please contact us directly on our ' : 'Por favor contáctanos directamente a nuestro '}<a href="https://wa.me/50672601238" target="_blank" rel="noopener noreferrer" className="font-bold underline text-green-700">{isEn ? 'Official WhatsApp (+506 7260 1238)' : 'WhatsApp Oficial (+506 7260 1238)'}</a>.</p>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Pills Bar when conversation is active */}
            {messages.length > 0 && (
              <div className="px-3 py-1.5 bg-white border-t border-gray-100 flex items-center gap-1.5 overflow-x-auto scrollbar-hide shrink-0">
                <button
                  onClick={() => handleQuickAction(t.chat.faqRatesQuery)}
                  className="px-2.5 py-1 rounded-full bg-gray-100 hover:bg-brand-blue/10 text-gray-700 hover:text-brand-blue text-[11px] font-semibold whitespace-nowrap transition-colors"
                >
                  {t.chat.pillRates}
                </button>
                <button
                  onClick={() => handleQuickAction(t.chat.faqLockerQuery)}
                  className="px-2.5 py-1 rounded-full bg-gray-100 hover:bg-brand-blue/10 text-gray-700 hover:text-brand-blue text-[11px] font-semibold whitespace-nowrap transition-colors"
                >
                  {t.chat.pillLocker}
                </button>
                <button
                  onClick={() => handleQuickAction(t.chat.faqTimesQuery)}
                  className="px-2.5 py-1 rounded-full bg-gray-100 hover:bg-brand-blue/10 text-gray-700 hover:text-brand-blue text-[11px] font-semibold whitespace-nowrap transition-colors"
                >
                  {t.chat.pillTimes}
                </button>
                <a
                  href="https://wa.me/50672601238"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-full bg-green-50 hover:bg-green-100 text-green-700 text-[11px] font-semibold whitespace-nowrap transition-colors flex items-center gap-1"
                >
                  <MessageCircle size={12} /> {t.chat.pillWhatsApp}
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
                  placeholder={t.chat.inputPlaceholder}
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
            className={`text-white px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-bold whitespace-nowrap hidden sm:flex items-center gap-2 pointer-events-none border ${
              isHalloween
                ? 'bg-gradient-to-r from-[#1A0B2E] via-[#2A0F45] to-[#1A0B2E] border-orange-400/40 shadow-[0_10px_28px_rgba(249,115,22,0.35)]'
                : 'bg-[#0B1D2B] border-white/10'
            }`}
          >
            <Sparkles size={14} className={isHalloween ? 'text-orange-400 animate-spin' : 'text-brand-yellow animate-spin'} />
            <span>
              {isHalloween ? '🎃' : '👋'} {isEn ? 'Hi! Talk with' : '¡Hola! Habla con'}{' '}
              <strong className={isHalloween ? 'text-orange-300 font-black' : 'text-brand-yellow font-black'}>
                Clari
              </strong>
            </span>
          </motion.div>

          <motion.div
            whileTap={{ scale: 0.92 }}
            className="relative cursor-pointer"
          >
            <AnimatedRobotFace
              isHovered={isTriggerHovered}
              isPatriotic={isPatriotic}
              isHalloween={isHalloween}
            />
          </motion.div>
        </button>
      )}
    </div>
  );
}
