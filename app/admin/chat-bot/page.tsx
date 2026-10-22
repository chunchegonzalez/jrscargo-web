'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bot,
  Headset,
  Send,
  Search,
  Bell,
  BellOff,
  User,
  Mail,
  Phone,
  Package,
  Clock,
  CheckCircle2,
  Sparkles,
  MessageCircle,
  Save,
  Trash2,
  RefreshCw,
  ExternalLink,
  HandMetal,
  FileText,
  Check,
} from 'lucide-react';

interface BotChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'agent' | 'system';
  senderName?: string;
  content: string;
  createdAt: string;
}

interface BotSessionRecord {
  dbId: string;
  sessionId: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  mode: 'bot' | 'agent' | 'closed';
  takenBy?: string;
  takenAt?: string;
  unreadForAdmin: number;
  trackings: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  messages: BotChatMessage[];
}

export default function AdminChatBotPage() {
  const [sessions, setSessions] = useState<BotSessionRecord[]>([]);
  const [selectedDbId, setSelectedDbId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'agent' | 'bot' | 'closed'>('all');
  const [currentUser, setCurrentUser] = useState<{ username: string; role: string } | null>(null);

  // Reply state
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isTakingOver, setIsTakingOver] = useState(false);

  // Editable Lead Info state
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSavingLead, setIsSavingLead] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sound Alert state
  const [soundEnabled, setSoundEnabled] = useState(true);
  const prevUnreadTotalRef = useRef<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const playNotificationBeep = useCallback(() => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Ignore audio context restriction
    }
  }, [soundEnabled]);

  const fetchSessions = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await fetch('/api/bot-sessions', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.sessions)) {
        const list: BotSessionRecord[] = data.sessions;
        setSessions(list);

        const totalUnread = list.reduce((acc, s) => acc + s.unreadForAdmin, 0);
        if (totalUnread > prevUnreadTotalRef.current && prevUnreadTotalRef.current !== 0) {
          playNotificationBeep();
        }
        prevUnreadTotalRef.current = totalUnread;
      }
    } catch (err) {
      console.error('Error fetching bot sessions:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [playNotificationBeep]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user) setCurrentUser(d.user);
      })
      .catch(() => {});

    fetchSessions(false);
    const interval = setInterval(() => fetchSessions(true), 3500);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  const selectedSession = selectedDbId
    ? sessions.find((s) => String(s.dbId) === String(selectedDbId)) || null
    : null;

  const handleSelectSession = (session: BotSessionRecord) => {
    setSelectedDbId(String(session.dbId));
    setEditName(session.name || '');
    setEditEmail(session.email || '');
    setEditPhone(session.phone || '');
    setEditNotes(session.notes || '');
    setSaveSuccess(false);

    if (session.unreadForAdmin > 0) {
      fetch('/api/bot-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_read',
          dbId: session.dbId,
          sessionId: session.sessionId,
        }),
      }).then(() => fetchSessions(true));
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedSession?.messages.length, selectedDbId]);

  const handleTakeOver = async () => {
    if (!selectedSession) return;
    setIsTakingOver(true);
    try {
      const agentName = currentUser?.username || 'Asesor JRS';
      const res = await fetch('/api/bot-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'takeover',
          dbId: selectedSession.dbId,
          sessionId: selectedSession.sessionId,
          agentName,
        }),
      });
      if (res.ok) {
        await fetchSessions(true);
      }
    } finally {
      setIsTakingOver(false);
    }
  };

  const handleReleaseToBot = async () => {
    if (!selectedSession) return;
    setIsTakingOver(true);
    try {
      const res = await fetch('/api/bot-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'release_to_bot',
          dbId: selectedSession.dbId,
          sessionId: selectedSession.sessionId,
        }),
      });
      if (res.ok) {
        await fetchSessions(true);
      }
    } finally {
      setIsTakingOver(false);
    }
  };

  const handleCloseSession = async () => {
    if (!selectedSession) return;
    await fetch('/api/bot-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'close',
        dbId: selectedSession.dbId,
        sessionId: selectedSession.sessionId,
      }),
    });
    await fetchSessions(true);
  };

  const handleSendAgentReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession || !replyText.trim()) return;

    const text = replyText.trim();
    setReplyText('');
    setIsSending(true);

    try {
      const agentName = currentUser?.username || 'Asesor JRS';
      const res = await fetch('/api/bot-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'agent_message',
          dbId: selectedSession.dbId,
          sessionId: selectedSession.sessionId,
          agentName,
          content: text,
        }),
      });
      if (res.ok) {
        await fetchSessions(true);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveLeadInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) return;
    setIsSavingLead(true);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/bot-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_lead_info',
          dbId: selectedSession.dbId,
          sessionId: selectedSession.sessionId,
          name: editName,
          email: editEmail,
          phone: editPhone,
          notes: editNotes,
        }),
      });
      if (res.ok) {
        setSaveSuccess(true);
        await fetchSessions(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } finally {
      setIsSavingLead(false);
    }
  };

  const handleDeleteSession = async (dbId: string) => {
    if (!confirm('¿Eliminar esta conversación del historial?')) return;
    await fetch(`/api/bot-sessions?dbId=${encodeURIComponent(dbId)}`, { method: 'DELETE' });
    if (selectedDbId === dbId) setSelectedDbId(null);
    await fetchSessions(true);
  };

  const filteredSessions = sessions.filter((s) => {
    if (statusFilter === 'unread' && s.unreadForAdmin <= 0 && s.status !== 'nuevo') return false;
    if (statusFilter === 'agent' && s.mode !== 'agent') return false;
    if (statusFilter === 'bot' && (s.mode !== 'bot' || s.status === 'cerrado')) return false;
    if (statusFilter === 'closed' && s.status !== 'cerrado') return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.phone.toLowerCase().includes(q) ||
      s.trackings.some((t) => t.toLowerCase().includes(q)) ||
      s.messages.some((m) => m.content.toLowerCase().includes(q))
    );
  });

  const unreadSessionsCount = sessions.filter((s) => s.unreadForAdmin > 0 || s.status === 'nuevo').length;
  const activeAgentCount = sessions.filter((s) => s.mode === 'agent').length;
  const activeBotCount = sessions.filter((s) => s.mode === 'bot' && s.status !== 'cerrado').length;

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString('es-CR', {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Alert Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-brand-blue text-brand-yellow flex items-center justify-center shadow-sm">
              <Bot size={22} />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
                Central de Chat Clari &amp; Toma de Mando
                {unreadSessionsCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-red-500 text-white animate-pulse">
                    🔔 {unreadSessionsCount} {unreadSessionsCount === 1 ? 'Alerta' : 'Alertas'}
                  </span>
                )}
              </h1>
              <p className="text-xs text-gray-500">
                Monitorea en vivo las consultas reales de clientes registrados, toma el mando como agente y gestiona sus datos.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setSoundEnabled((prev) => !prev)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
              soundEnabled
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-gray-50 border-gray-200 text-gray-500'
            }`}
            title="Activar/Desactivar sonido de alerta al recibir nuevas consultas"
          >
            {soundEnabled ? <Bell size={15} className="text-amber-600" /> : <BellOff size={15} />}
            <span>{soundEnabled ? 'Alertas Sonoras: ON' : 'Silenciado'}</span>
          </button>

          <button
            onClick={() => fetchSessions(false)}
            className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
            title="Actualizar conversaciones"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <Bell size={20} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase">Alertas / Nuevas</p>
            <p className="text-2xl font-black text-gray-900">{unreadSessionsCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Headset size={20} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase">Agente en Mando</p>
            <p className="text-2xl font-black text-emerald-600">{activeAgentCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center shrink-0">
            <Bot size={20} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase">Atendidas por Bot</p>
            <p className="text-2xl font-black text-brand-blue">{activeBotCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <User size={20} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase">Total Consultas</p>
            <p className="text-2xl font-black text-gray-900">{sessions.length}</p>
          </div>
        </div>
      </div>

      {/* Main 3-Column Live Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[640px]">
        {/* Left Column: Conversations List (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-100 shadow-xs flex flex-col overflow-hidden h-[660px]">
          <div className="p-3.5 border-b border-gray-100 space-y-2.5">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, correo, teléfono, guía..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-brand-blue"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
              {[
                { id: 'all', label: 'Todas' },
                { id: 'unread', label: `🔔 Alertas (${unreadSessionsCount})` },
                { id: 'agent', label: '👨‍💻 En Mando' },
                { id: 'bot', label: '🤖 Clari AI' },
                { id: 'closed', label: '✅ Cerradas' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id as typeof statusFilter)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors ${
                    statusFilter === tab.id
                      ? 'bg-brand-blue text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {filteredSessions.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs">
                No hay conversaciones activas en esta vista.
              </div>
            ) : (
              filteredSessions.map((session) => {
                const isSelected = selectedDbId !== null && String(session.dbId) === String(selectedDbId);
                const lastMsg = session.messages[session.messages.length - 1];
                const hasAlert = session.unreadForAdmin > 0 || session.status === 'nuevo';

                return (
                  <button
                    key={session.dbId}
                    onClick={() => handleSelectSession(session)}
                    className={`w-full text-left p-3.5 transition-all hover:bg-slate-50 flex flex-col gap-1.5 relative ${
                      isSelected ? 'bg-brand-blue/5 border-l-4 border-l-brand-blue' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-black text-gray-900 truncate flex items-center gap-1.5">
                          {session.name}
                          {hasAlert && (
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
                          )}
                        </p>
                        <p className="text-[11px] text-gray-500 truncate">{session.email}</p>
                        {session.phone && (
                          <p className="text-[10px] text-brand-blue font-semibold truncate">
                            📱 {session.phone}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end shrink-0 gap-1">
                        <span className="text-[10px] text-gray-400 font-medium">
                          {formatTime(session.updatedAt)}
                        </span>
                        {session.mode === 'agent' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                            <Headset size={10} /> {session.takenBy || 'Agente'}
                          </span>
                        ) : session.status === 'cerrado' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">
                            Resuelto
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-brand-blue flex items-center gap-1">
                            <Bot size={10} /> Clari AI
                          </span>
                        )}
                      </div>
                    </div>

                    {session.trackings.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {session.trackings.map((trk) => (
                          <span
                            key={trk}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 border border-amber-200/80 text-amber-800 text-[10px] font-bold"
                          >
                            <Package size={10} /> {trk}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-[11px] text-gray-600 truncate">
                        {lastMsg ? lastMsg.content.replace(/\*/g, '') : 'Consulta activa'}
                      </p>
                      {session.unreadForAdmin > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black shrink-0">
                          {session.unreadForAdmin}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Center Column: Live Chat Console & Takeover Controls (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-100 shadow-xs flex flex-col overflow-hidden h-[660px]">
          {!selectedSession ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-3 text-brand-blue/40">
                <Headset size={32} />
              </div>
              <p className="text-sm font-bold text-gray-700 mb-1">Selecciona una conversación</p>
              <p className="text-xs text-gray-400 max-w-xs">
                Haz clic en cualquier consulta de la lista izquierda para ver los mensajes en vivo, tomar el mando o guardar los datos del cliente.
              </p>
            </div>
          ) : (
            <>
              {/* Top Takeover Bar */}
              <div className="p-4 bg-[#0B1D2B] text-white flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm truncate">{selectedSession.name}</h3>
                    {selectedSession.mode === 'agent' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500 text-white flex items-center gap-1">
                        <Headset size={11} /> En Mando ({selectedSession.takenBy || 'Agente'})
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-brand-yellow/20 text-brand-yellow flex items-center gap-1">
                        <Bot size={11} /> Modo Automático Clari
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-300 truncate">
                    {selectedSession.email}
                    {selectedSession.phone ? ` • 📱 ${selectedSession.phone}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {selectedSession.mode !== 'agent' ? (
                    <button
                      onClick={handleTakeOver}
                      disabled={isTakingOver}
                      className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                      <HandMetal size={14} />
                      <span>Tomar el Mando</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleReleaseToBot}
                      disabled={isTakingOver}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Bot size={14} className="text-brand-yellow" />
                      <span>Devolver a Clari</span>
                    </button>
                  )}

                  {selectedSession.status !== 'cerrado' && (
                    <button
                      onClick={handleCloseSession}
                      className="p-2 rounded-xl bg-white/10 hover:bg-emerald-500/20 text-gray-300 hover:text-emerald-300 transition-colors"
                      title="Marcar consulta como resuelta"
                    >
                      <CheckCircle2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Status Banner */}
              <div
                className={`px-4 py-2 text-[11px] font-bold flex items-center justify-between shrink-0 ${
                  selectedSession.mode === 'agent'
                    ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
                    : 'bg-amber-50/80 text-amber-900 border-b border-amber-200/70'
                }`}
              >
                {selectedSession.mode === 'agent' ? (
                  <span>
                    🟢 Tienes el control en vivo de este chat. Lo que escribas abajo le llegará en tiempo real al cliente en la web.
                  </span>
                ) : (
                  <span>
                    🤖 Clari AI está respondiendo automáticamente. Haz clic en &quot;Tomar el Mando&quot; o envía un mensaje para intervenir en vivo.
                  </span>
                )}
              </div>

              {/* Messages History */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/70">
                {selectedSession.messages.map((m) => {
                  if (m.role === 'system') {
                    return (
                      <div key={m.id} className="flex justify-center my-2">
                        <span className="px-3 py-1 rounded-full bg-gray-200/80 text-gray-700 text-[11px] font-bold">
                          {m.content.replace(/\*/g, '')}
                        </span>
                      </div>
                    );
                  }

                  const isCustomer = m.role === 'user';
                  const isAgent = m.role === 'agent';

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-[10px] font-extrabold text-gray-500">
                          {isCustomer
                            ? `👤 ${selectedSession.name}`
                            : isAgent
                              ? `👨‍💻 ${m.senderName || 'Agente JRS'}`
                              : '🤖 Clari AI'}
                        </span>
                        <span className="text-[10px] text-gray-400">{formatTime(m.createdAt)}</span>
                      </div>

                      <div
                        className={`max-w-[85%] p-3 rounded-2xl text-xs whitespace-pre-wrap leading-relaxed shadow-2xs ${
                          isCustomer
                            ? 'bg-white border border-gray-200 text-gray-800 rounded-tl-xs'
                            : isAgent
                              ? 'bg-emerald-600 text-white rounded-tr-xs font-medium'
                              : 'bg-[#0B1D2B] text-white rounded-tr-xs'
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Agent Responses */}
              <div className="px-3 py-1.5 bg-white border-t border-gray-100 flex items-center gap-1.5 overflow-x-auto">
                {[
                  '¡Hola! Te atiende un asesor de JRS Cargo en vivo, ¿en qué te puedo ayudar?',
                  'Con gusto estamos verificando tu número de guía en nuestra bodega.',
                  '¿Me podrías confirmar tu dirección para coordinar la entrega?',
                ].map((quick, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setReplyText(quick)}
                    className="px-2.5 py-1 rounded-full bg-gray-100 hover:bg-emerald-50 text-gray-600 hover:text-emerald-700 text-[10px] font-bold whitespace-nowrap transition-colors"
                  >
                    + Respuesta rápida {idx + 1}
                  </button>
                ))}
              </div>

              {/* Agent Live Input Box */}
              <form
                onSubmit={handleSendAgentReply}
                className="p-3 bg-white border-t border-gray-100 flex items-center gap-2 shrink-0"
              >
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Escribe un mensaje en vivo al cliente (toma el mando automáticamente)..."
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-emerald-600"
                  disabled={isSending}
                />
                <button
                  type="submit"
                  disabled={isSending || !replyText.trim()}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Send size={14} />
                  <span>Enviar</span>
                </button>
              </form>
            </>
          )}
        </div>

        {/* Right Column: Customer Info Card & Persistence in Clients (3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-xs flex flex-col overflow-hidden h-[660px]">
          <div className="p-4 border-b border-gray-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User size={16} className="text-brand-blue" />
              <h3 className="font-black text-xs text-gray-800 uppercase tracking-wider">
                Datos de la Persona
              </h3>
            </div>
            {selectedSession && (
              <button
                onClick={() => handleDeleteSession(selectedSession.dbId)}
                className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                title="Eliminar registro"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>

          {!selectedSession ? (
            <div className="p-6 text-center text-xs text-gray-400 flex-1 flex items-center justify-center">
              Selecciona una consulta para ver y guardar la información del cliente.
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <form onSubmit={handleSaveLeadInfo} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">
                    Nombre del Cliente
                  </label>
                  <div className="relative">
                    <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:border-brand-blue"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      required
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:border-brand-blue"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">
                    Teléfono / WhatsApp
                  </label>
                  <div className="relative">
                    <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      required
                      placeholder="Ej. 8888-8888"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:border-brand-blue"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1 flex items-center gap-1">
                    <FileText size={12} /> Notas de Seguimiento
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Agrega detalles sobre el paquete o consulta de esta persona..."
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-brand-blue"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSavingLead}
                  className="w-full py-2.5 rounded-xl bg-brand-blue hover:bg-brand-blue/90 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  {saveSuccess ? (
                    <>
                      <Check size={14} className="text-emerald-300" />
                      <span>¡Guardado en Clientes!</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>{isSavingLead ? 'Guardando...' : 'Guardar en Base de Clientes'}</span>
                    </>
                  )}
                </button>
              </form>

              {/* Direct WhatsApp Contact Button if Phone exists */}
              {editPhone.trim() && (
                <a
                  href={`https://wa.me/${editPhone.replace(/\D/g, '').length === 8 ? `506${editPhone.replace(/\D/g, '')}` : editPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${editName}, te escribimos de JRS Cargo respecto a tu consulta en nuestro sitio web.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#1fb855] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <MessageCircle size={15} />
                  <span>Contactar Cliente por WhatsApp</span>
                  <ExternalLink size={12} />
                </a>
              )}

              {/* Trackings Queried by Customer */}
              <div className="pt-3 border-t border-gray-100">
                <p className="text-[11px] font-bold text-gray-500 uppercase mb-2 flex items-center gap-1.5">
                  <Package size={13} className="text-brand-blue" /> Guías Consultadas
                </p>
                {selectedSession.trackings.length === 0 ? (
                  <p className="text-xs text-gray-400">Ninguna guía detectada aún.</p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedSession.trackings.map((trk) => (
                      <div
                        key={trk}
                        className="flex items-center justify-between px-3 py-2 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs font-bold text-amber-900"
                      >
                        <span className="truncate">{trk}</span>
                        <a
                          href={`/admin/tracking`}
                          className="text-[11px] text-brand-blue underline flex items-center gap-1 shrink-0"
                        >
                          Ver <ExternalLink size={11} />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="pt-3 border-t border-gray-100 text-[11px] text-gray-400 space-y-1">
                <p className="flex items-center gap-1.5">
                  <Clock size={12} /> Inicio: {formatTime(selectedSession.createdAt)}
                </p>
                <p className="flex items-center gap-1.5">
                  <Sparkles size={12} /> Guardado automáticamente en Clientes
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
