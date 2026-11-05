'use client';

import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

export default function WhatsAppConnectionPage() {
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  // Estado da Conexão
  const [status, setStatus] = useState<'CONNECTED' | 'CONNECTING' | 'DISCONNECTED'>('DISCONNECTED');
  const [phone, setPhone] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);

  // Configuração Padrão já apontando para o Render em Produção
  const [provider, setProvider] = useState<'EVOLUTION' | 'WAHA'>('WAHA');
  const [apiUrl, setApiUrl] = useState('https://evolution-checkout.onrender.com');
  const [apiKey, setApiKey] = useState('checkout2026secretkey');
  const [instance, setInstance] = useState('default');
  const [testNumber, setTestNumber] = useState('');

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchStatus();
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Polling automático enquanto estiver aguardando leitura do QR Code
  useEffect(() => {
    if (status === 'CONNECTING') {
      pollIntervalRef.current = setInterval(() => {
        fetchStatus(false);
      }, 3500);
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [status]);

  async function fetchStatus(showLoading = true) {
    try {
      if (showLoading) setLoading(true);
      const res = await fetch('/api/dashboard/whatsapp');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.configured) {
        setStatus(data.status);
        setPhone(data.phone);
        setQrCode(data.qrCode);
        if (data.provider) setProvider(data.provider);
        if (data.apiUrl) setApiUrl(data.apiUrl);
        if (data.apiKey) setApiKey(data.apiKey);
        if (data.instance) setInstance(data.instance);
      }
    } catch (err: any) {
      console.warn('Erro ao verificar status do WhatsApp:', err.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  async function handleConnect(e?: React.FormEvent) {
    if (e) e.preventDefault();
    try {
      setConnecting(true);
      const res = await fetch('/api/dashboard/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'connect',
          provider,
          apiUrl,
          apiKey,
          instance,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(data.message || 'QR Code gerado!');
      if (data.qrCode) {
        setQrCode(data.qrCode);
        setStatus('CONNECTING');
      } else {
        // Busca status em seguida
        setTimeout(() => fetchStatus(false), 2000);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao conectar WhatsApp');
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm('Deseja realmente desconectar esta sessão do WhatsApp?')) return;
    try {
      setDisconnecting(true);
      const res = await fetch('/api/dashboard/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'disconnect',
          provider,
          apiUrl,
          apiKey,
          instance,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success('WhatsApp desconectado!');
      setStatus('DISCONNECTED');
      setPhone(null);
      setQrCode(null);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao desconectar');
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleSendTest(e: React.FormEvent) {
    e.preventDefault();
    if (!testNumber) {
      toast.error('Informe seu número de WhatsApp com DDD');
      return;
    }
    try {
      setSendingTest(true);
      const res = await fetch('/api/dashboard/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          provider,
          apiUrl,
          apiKey,
          instance,
          testNumber,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success('🎉 Mensagem de teste enviada com sucesso no seu WhatsApp!');
    } catch (err: any) {
      toast.error(err.message || 'Falha ao enviar mensagem de teste');
    } finally {
      setSendingTest(false);
    }
  }

  const setPreset = (selectedProvider: 'EVOLUTION' | 'WAHA') => {
    setProvider(selectedProvider);
    if (selectedProvider === 'EVOLUTION') {
      setApiUrl('http://localhost:8080');
      setApiKey('');
    } else {
      setApiUrl('http://localhost:3000');
      setApiKey('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-green-200 border-t-green-600 animate-spin" />
        <p className="text-surface-500 text-sm">Carregando status do WhatsApp...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-surface-800 flex items-center gap-2.5">
            <span className="text-2xl">💬</span> Conectar WhatsApp Nativo (QR Code)
          </h2>
          <p className="text-surface-500 text-sm mt-0.5">
            Conecte seu WhatsApp apontando a câmera do celular para o QR Code. Disparo 100% automático dos infoprodutos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              status === 'CONNECTED'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : status === 'CONNECTING'
                ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                : 'bg-surface-100 text-surface-600 border border-surface-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                status === 'CONNECTED' ? 'bg-emerald-500' : status === 'CONNECTING' ? 'bg-amber-500' : 'bg-surface-400'
              }`}
            />
            {status === 'CONNECTED' ? 'Conectado' : status === 'CONNECTING' ? 'Aguardando QR Code' : 'Desconectado'}
          </span>
        </div>
      </div>

      {/* PAINEL QUANDO CONECTADO */}
      {status === 'CONNECTED' && (
        <div className="glass-card p-6 sm:p-8 border-2 border-emerald-300 bg-gradient-to-br from-emerald-50/50 via-white to-green-50/30 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-100 pb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-3xl shadow-lg shadow-emerald-500/20">
                ✓
              </div>
              <div>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full uppercase">
                  Ativo & Pronto para Disparos
                </span>
                <h3 className="text-xl font-bold text-surface-900 mt-1">WhatsApp Conectado com Sucesso!</h3>
                <p className="text-surface-600 text-xs">
                  Provedor: <strong>{provider}</strong> | Instância: <strong>{instance}</strong>
                  {phone && <> | Número: <strong className="text-emerald-700">{phone}</strong></>}
                </p>
              </div>
            </div>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-50"
            >
              {disconnecting ? 'Desconectando...' : '🔌 Desconectar Sessão'}
            </button>
          </div>

          {/* Teste de Envio */}
          <div className="p-5 bg-white rounded-2xl border border-surface-200 shadow-sm space-y-3">
            <div>
              <h4 className="text-sm font-bold text-surface-800 flex items-center gap-2">
                <span>📱</span> Testar Envio em Tempo Real
              </h4>
              <p className="text-xs text-surface-500">
                Digite seu número de WhatsApp com DDD para receber uma mensagem de teste e certificar que está entregando.
              </p>
            </div>
            <form onSubmit={handleSendTest} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                required
                value={testNumber}
                onChange={(e) => setTestNumber(e.target.value)}
                placeholder="Ex: 11999998888 ou 5511999998888"
                className="input-field flex-1 text-sm font-mono"
              />
              <button
                type="submit"
                disabled={sendingTest}
                className="btn-primary text-sm whitespace-nowrap flex items-center justify-center gap-2 px-6"
              >
                {sendingTest ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <span>📤</span> Enviar Teste
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PAINEL QUANDO AGUARDANDO QR CODE (CONNECTING) */}
      {status === 'CONNECTING' && qrCode && (
        <div className="glass-card p-6 sm:p-8 border-2 border-primary-300 shadow-xl text-center space-y-6">
          <div>
            <span className="text-xs bg-primary-100 text-primary-800 font-bold px-3 py-1 rounded-full uppercase">
              Escaneie o QR Code
            </span>
            <h3 className="text-2xl font-bold text-surface-900 mt-2">Conecte seu WhatsApp</h3>
            <p className="text-surface-500 text-xs mt-1">
              Abra o WhatsApp no seu smartphone e aponte a câmera para o código abaixo.
            </p>
          </div>

          {/* QR Code Container */}
          <div className="flex justify-center">
            <div className="p-5 bg-white border-4 border-primary-100 rounded-3xl shadow-xl relative inline-block">
              <img
                src={qrCode}
                alt="QR Code WhatsApp"
                className="w-64 h-64 sm:w-72 sm:h-72 object-contain mx-auto rounded-xl"
              />
              <div className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-primary-700">
                <span className="w-2.5 h-2.5 rounded-full bg-primary-500 animate-ping" />
                Aguardando leitura do aparelho...
              </div>
            </div>
          </div>

          {/* Instruções */}
          <div className="max-w-md mx-auto text-left bg-surface-50 p-4 rounded-2xl border border-surface-200 text-xs text-surface-700 space-y-1.5">
            <p className="font-bold text-surface-800">Passo a passo no seu celular:</p>
            <p>1. Abra o <strong>WhatsApp</strong> no seu aparelho.</p>
            <p>2. Toque em <strong>Mais opções</strong> (⋮ no Android) ou <strong>Configurações</strong> (⚙️ no iPhone).</p>
            <p>3. Toque em <strong>Aparelhos Conectados</strong> e depois em <strong>Conectar um Aparelho</strong>.</p>
            <p>4. Aponte a câmera para este QR Code na tela.</p>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => handleConnect()}
              disabled={connecting}
              className="btn-secondary text-xs"
            >
              🔄 Recarregar QR Code
            </button>
            <button
              onClick={handleDisconnect}
              className="text-xs text-red-600 hover:underline font-semibold"
            >
              Cancelar Conexão
            </button>
          </div>
        </div>
      )}

      {/* FORMULÁRIO DE CONEXÃO & CONFIGURAÇÃO DO SERVIDOR */}
      {status !== 'CONNECTED' && (
        <div className="glass-card p-6 space-y-6">
          <div className="border-b border-surface-100 pb-4">
            <h3 className="font-bold text-surface-800 text-base flex items-center gap-2">
              <span>⚙️</span> Configurar Motor WhatsApp (Evolution API ou WAHA)
            </h3>
            <p className="text-surface-500 text-xs mt-0.5">
              Escolha seu provedor e aponte para sua instância local ou hospedada na nuvem.
            </p>
          </div>

          {/* Escolha do Provedor */}
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setPreset('EVOLUTION')}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${
                provider === 'EVOLUTION'
                  ? 'border-green-500 bg-green-50/60 shadow-sm'
                  : 'border-surface-200 bg-surface-50 hover:bg-surface-100'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm text-surface-800">Evolution API v2</span>
                {provider === 'EVOLUTION' && <span className="text-green-600 font-bold">✓ Selecionado</span>}
              </div>
              <p className="text-xs text-surface-500">
                Padrão da comunidade. Baileys oficial, alta estabilidade e suporte nativo a QR Code em base64.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setPreset('WAHA')}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${
                provider === 'WAHA'
                  ? 'border-green-500 bg-green-50/60 shadow-sm'
                  : 'border-surface-200 bg-surface-50 hover:bg-surface-100'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm text-surface-800">WAHA (WhatsApp HTTP API)</span>
                {provider === 'WAHA' && <span className="text-green-600 font-bold">✓ Selecionado</span>}
              </div>
              <p className="text-xs text-surface-500">
                Super leve e modular. HTTP REST puro com suporte a QR Code em imagem direta.
              </p>
            </button>
          </div>

          <form onSubmit={handleConnect} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  URL do Servidor ({provider})
                </label>
                <input
                  type="url"
                  required
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="http://localhost:8080 ou https://evolution.seudominio.com"
                  className="input-field font-mono text-xs"
                />
                <p className="text-[11px] text-surface-400 mt-1">
                  Se estiver rodando local via Docker: <code>http://localhost:8080</code> (Evolution) ou <code>http://localhost:3000</code> (WAHA).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  API Key / Global Authentication Key
                </label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Ex: 4296fac59e627b7665217593a5ec914e"
                  className="input-field font-mono text-xs"
                />
                <p className="text-[11px] text-surface-400 mt-1">
                  Chave configurada em <code>AUTHENTICATION_API_KEY</code> no seu servidor.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">
                Nome da Instância / Sessão
              </label>
              <input
                type="text"
                required
                value={instance}
                onChange={(e) => setInstance(e.target.value)}
                placeholder="checkout-pro"
                className="input-field font-mono text-xs"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="submit"
                disabled={connecting}
                className="btn-primary text-sm flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg transition-all"
              >
                {connecting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Gerando QR Code...
                  </>
                ) : (
                  <>
                    <span>📱</span> Gerar QR Code e Conectar WhatsApp
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* GUIA PRODUÇÃO NO RENDER & DOCKER */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Render Card */}
        <div className="glass-card p-6 border-2 border-primary-200 bg-gradient-to-br from-primary-50/40 via-white to-blue-50/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs bg-primary-100 text-primary-800 font-bold px-2.5 py-0.5 rounded-full uppercase">
              100% Online 24/7 (Recomendado)
            </span>
            <span className="text-xl">☁️</span>
          </div>
          <h4 className="font-bold text-surface-900 text-base">Hospedar Conector no Render</h4>
          <p className="text-xs text-surface-600 leading-relaxed">
            Ao rodar em produção no Render, sua conexão do WhatsApp fica ativa 24 horas por dia sem depender do seu computador ligado.
          </p>
          <ul className="text-xs text-surface-700 space-y-1.5 list-disc list-inside">
            <li>Sessão e chaves salvas no <strong>Supabase PostgreSQL</strong> (nunca perde o login).</li>
            <li><strong>Keep-Alive Vercel Cron</strong> ativo: o sistema pinga o servidor a cada 10 min para não dormir.</li>
            <li>Configurado no arquivo <code>render.yaml</code> na raiz do projeto.</li>
          </ul>
          <div className="pt-2">
            <a
              href="https://dashboard.render.com"
              target="_blank"
              rel="noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-sm transition-all"
            >
              <span>🚀</span> Abrir Painel do Render (Deploy)
            </a>
          </div>
        </div>

        {/* Local Docker Card */}
        <div className="glass-card p-6 border border-surface-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs bg-surface-100 text-surface-700 font-bold px-2.5 py-0.5 rounded-full uppercase">
              Ambiente de Testes / Local
            </span>
            <span className="text-xl">💻</span>
          </div>
          <h4 className="font-bold text-surface-800 text-base">Rodar Local com Docker</h4>
          <p className="text-xs text-surface-600 leading-relaxed">
            Caso prefira testar no seu próprio computador antes de subir para a nuvem:
          </p>
          <div className="bg-surface-900 text-surface-100 p-2.5 rounded-xl font-mono text-[11px] overflow-x-auto">
            <code>docker compose -f docker-compose.whatsapp.yml up -d</code>
          </div>
          <p className="text-[11px] text-surface-500">
            Evolution API em <code>http://localhost:8080</code> com chave <code>checkout2026secretkey</code>.
          </p>
        </div>
      </div>
    </div>
  );
}

