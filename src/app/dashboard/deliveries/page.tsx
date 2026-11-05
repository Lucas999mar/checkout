'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface DeliveryLog {
  id: string;
  paymentId: string;
  customerEmail: string | null;
  customerPhone: string | null;
  productName: string | null;
  channel: string; // 'EMAIL' | 'WHATSAPP' | 'SYSTEM'
  status: string; // 'SUCCESS' | 'FAILED' | 'LOGGED'
  detail: string | null;
  createdAt: string;
}

interface DeliveryConfig {
  id: string;
  emailSenderName: string;
  emailSenderAddress: string;
  resendApiKey: string | null;
  whatsappApiUrl: string | null;
  whatsappApiKey: string | null;
  whatsappInstance: string | null;
  whatsappDefaultMsg: string | null;
}

export default function DeliveriesPage() {
  const [activeTab, setActiveTab] = useState<'logs' | 'settings'>('logs');
  const [logs, setLogs] = useState<DeliveryLog[]>([]);
  const [config, setConfig] = useState<DeliveryConfig | null>(null);
  const [stats, setStats] = useState({ total: 0, success: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);

  // Form de Configuração
  const [formConfig, setFormConfig] = useState({
    emailSenderName: 'Checkout Pro',
    emailSenderAddress: 'onboarding@resend.dev',
    resendApiKey: '',
    whatsappApiUrl: '',
    whatsappApiKey: '',
    whatsappInstance: '',
    whatsappDefaultMsg: '',
  });

  useEffect(() => {
    fetchDeliveries();
  }, []);

  async function fetchDeliveries() {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard/deliveries');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setLogs(data.logs || []);
      setConfig(data.config || null);
      setStats(data.stats || { total: 0, success: 0, failed: 0 });

      if (data.config) {
        setFormConfig({
          emailSenderName: data.config.emailSenderName || 'Checkout Pro',
          emailSenderAddress: data.config.emailSenderAddress || 'onboarding@resend.dev',
          resendApiKey: data.config.resendApiKey || '',
          whatsappApiUrl: data.config.whatsappApiUrl || '',
          whatsappApiKey: data.config.whatsappApiKey || '',
          whatsappInstance: data.config.whatsappInstance || '',
          whatsappDefaultMsg: data.config.whatsappDefaultMsg || '',
        });
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao carregar dados de entrega');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSavingConfig(true);
      const res = await fetch('/api/dashboard/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formConfig),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success('Configurações de disparo salvas com sucesso!');
      setConfig(data.config);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar configurações');
    } finally {
      setSavingConfig(false);
    }
  }

  async function handleResend(paymentId: string) {
    try {
      setResendingId(paymentId);
      const res = await fetch('/api/dashboard/deliveries/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success('Disparo reenviado com sucesso para o cliente!');
      fetchDeliveries();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao reenviar produto');
    } finally {
      setResendingId(null);
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-surface-800">Disparos & Entrega Automática</h2>
          <p className="text-surface-500 text-sm">
            Monitore e configure a entrega automática de PDFs, vídeos, documentos e cursos para WhatsApp e E-mail.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'logs'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
            }`}
          >
            📋 Histórico de Disparos
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'settings'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
            }`}
          >
            ⚙️ Gateways WhatsApp & E-mail
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Total de Disparos</p>
              <h3 className="text-2xl font-extrabold text-surface-800 mt-1">{stats.total}</h3>
            </div>
            <span className="text-2xl p-2.5 bg-blue-100 text-blue-700 rounded-xl">🚀</span>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Entregas Concluídas</p>
              <h3 className="text-2xl font-extrabold text-emerald-600 mt-1">{stats.success}</h3>
            </div>
            <span className="text-2xl p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">✅</span>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider">WhatsApp Gateway</p>
              <h3 className="text-sm font-bold text-surface-800 mt-2">
                {config?.whatsappApiUrl ? '🟢 Conectado' : '⚡ wa.me Ativo'}
              </h3>
            </div>
            <span className="text-2xl p-2.5 bg-green-100 text-green-700 rounded-xl">💬</span>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider">E-mail Transacional</p>
              <h3 className="text-sm font-bold text-surface-800 mt-2">
                {config?.resendApiKey ? '🟢 Resend Ativo' : '⚪ Padrão'}
              </h3>
            </div>
            <span className="text-2xl p-2.5 bg-purple-100 text-purple-700 rounded-xl">✉️</span>
          </div>
        </div>
      </div>

      {/* Tab: Histórico de Logs */}
      {activeTab === 'logs' && (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-surface-100 flex items-center justify-between bg-surface-50/50">
            <h3 className="font-bold text-surface-800 text-sm flex items-center gap-2">
              <span>📋</span> Registro Detalhado de Disparos aos Compradores
            </h3>
            <button
              onClick={fetchDeliveries}
              className="text-xs text-primary-600 hover:text-primary-700 font-semibold"
            >
              🔄 Atualizar
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-surface-400">
              <div className="w-8 h-8 rounded-full border-4 border-primary-200 border-t-primary-600 animate-spin mx-auto mb-2" />
              Carregando histórico...
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-surface-400">
              <p className="text-4xl mb-2">📦</p>
              <p className="font-semibold text-surface-700">Nenhum disparo registrado ainda</p>
              <p className="text-xs text-surface-400 mt-1">
                Quando um pagamento for aprovado, o infoproduto será entregue e registrado aqui automaticamente.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-surface-50 text-surface-600 uppercase font-semibold border-b border-surface-100">
                    <th className="py-3 px-4">Canal</th>
                    <th className="py-3 px-4">Produto</th>
                    <th className="py-3 px-4">Destinatário</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Detalhes</th>
                    <th className="py-3 px-4">Data / Hora</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {logs.map((log) => {
                    const isSuccess = log.status === 'SUCCESS';
                    const isWa = log.channel === 'WHATSAPP';
                    const cleanPhone = log.customerPhone?.replace(/\D/g, '');
                    const waLink = cleanPhone ? `https://wa.me/${cleanPhone.length <= 11 ? '55' + cleanPhone : cleanPhone}` : null;

                    return (
                      <tr key={log.id} className="hover:bg-surface-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-bold text-[11px] ${
                              isWa ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {isWa ? '💬 WhatsApp' : '✉️ E-mail'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-surface-800">
                          {log.productName || 'Infoproduto'}
                        </td>
                        <td className="py-3 px-4 text-surface-600">
                          {log.customerEmail && <div>{log.customerEmail}</div>}
                          {log.customerPhone && <div className="text-surface-400 text-[11px]">{log.customerPhone}</div>}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                              isSuccess
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-surface-500 max-w-xs truncate" title={log.detail || ''}>
                          {log.detail || '-'}
                        </td>
                        <td className="py-3 px-4 text-surface-400 whitespace-nowrap">
                          {formatDate(log.createdAt)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {waLink && (
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-1 bg-green-50 text-green-700 hover:bg-green-100 font-semibold rounded text-[11px]"
                                title="Abrir conversa no WhatsApp"
                              >
                                Abrir WhatsApp
                              </a>
                            )}
                            <button
                              onClick={() => handleResend(log.paymentId)}
                              disabled={resendingId === log.paymentId}
                              className="px-2 py-1 bg-primary-50 text-primary-700 hover:bg-primary-100 font-semibold rounded text-[11px] disabled:opacity-50"
                            >
                              {resendingId === log.paymentId ? 'Reenviando...' : 'Reenviar'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Configurações de Gateways */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveConfig} className="space-y-6">
          {/* Seção WhatsApp */}
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-surface-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-xl">
                  💬
                </div>
                <div>
                  <h3 className="font-bold text-surface-800 text-base">Disparo Automático via WhatsApp</h3>
                  <p className="text-xs text-surface-500">
                    Envie a mensagem de entrega diretamente para o WhatsApp do comprador via API/Gateway (Evolution API, Z-API, Baileys ou Webhook).
                  </p>
                </div>
              </div>
              <span className="text-xs bg-green-100 text-green-800 font-bold px-2.5 py-1 rounded-full">
                WhatsApp Bot / Gateway
              </span>
            </div>

            <div className="p-3.5 bg-green-50/60 rounded-xl border border-green-200/80 text-xs text-green-900">
              💡 <strong>Como Funciona:</strong> Quando preenchido, o sistema faz requisições POST automáticas para o seu endpoint enviando o número e a mensagem completa com o link do PDF/vídeo/curso. Se preferir não usar gateway de terceiros, o checkout já fornece o botão oficial do <strong>wa.me</strong> diretamente para o comprador receber o acesso no WhatsApp!
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  URL da API de Envio de Mensagem (POST)
                </label>
                <input
                  type="url"
                  value={formConfig.whatsappApiUrl}
                  onChange={(e) => setFormConfig({ ...formConfig, whatsappApiUrl: e.target.value })}
                  className="input-field"
                  placeholder="https://api.meuzap.com/message/sendText/sua-instancia"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  API Key / Token de Autenticação (Bearer / apikey)
                </label>
                <input
                  type="text"
                  value={formConfig.whatsappApiKey}
                  onChange={(e) => setFormConfig({ ...formConfig, whatsappApiKey: e.target.value })}
                  className="input-field font-mono text-xs"
                  placeholder="Ex: B6D711FCDE4D4FD59365441..."
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Nome da Instância / Sessão (Opcional)
                </label>
                <input
                  type="text"
                  value={formConfig.whatsappInstance}
                  onChange={(e) => setFormConfig({ ...formConfig, whatsappInstance: e.target.value })}
                  className="input-field"
                  placeholder="Ex: default ou minha-instancia"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Mensagem Adicional / Saudação (Opcional)
                </label>
                <input
                  type="text"
                  value={formConfig.whatsappDefaultMsg}
                  onChange={(e) => setFormConfig({ ...formConfig, whatsappDefaultMsg: e.target.value })}
                  className="input-field"
                  placeholder="Ex: Muito obrigado pela confiança em nossa equipe!"
                />
              </div>
            </div>
          </div>

          {/* Seção E-mail */}
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-surface-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-xl">
                  ✉️
                </div>
                <div>
                  <h3 className="font-bold text-surface-800 text-base">Disparo de E-mail Transacional (Resend)</h3>
                  <p className="text-xs text-surface-500">
                    Dispara o e-mail responsivo em HTML com o botão de acesso, link do PDF e comprovante da transação.
                  </p>
                </div>
              </div>
              <span className="text-xs bg-purple-100 text-purple-800 font-bold px-2.5 py-1 rounded-full">
                HTML Responsivo
              </span>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Chave API Resend (API Key)
                </label>
                <input
                  type="password"
                  value={formConfig.resendApiKey}
                  onChange={(e) => setFormConfig({ ...formConfig, resendApiKey: e.target.value })}
                  className="input-field font-mono text-xs"
                  placeholder="re_123456789..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Nome do Remetente
                </label>
                <input
                  type="text"
                  value={formConfig.emailSenderName}
                  onChange={(e) => setFormConfig({ ...formConfig, emailSenderName: e.target.value })}
                  className="input-field"
                  placeholder="Ex: Checkout Pro ou Meu Curso"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  E-mail do Remetente
                </label>
                <input
                  type="email"
                  value={formConfig.emailSenderAddress}
                  onChange={(e) => setFormConfig({ ...formConfig, emailSenderAddress: e.target.value })}
                  className="input-field"
                  placeholder="onboarding@resend.dev ou contato@seusite.com"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={savingConfig}
              className="btn-primary text-sm flex items-center gap-2"
            >
              {savingConfig ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <span>💾</span> Salvar Configurações de Disparo
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
