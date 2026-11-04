'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface BankConfigItem {
  code: string;
  name: string;
  shortName: string;
  color: string;
  badgeColor: string;
  icon: string;
  active: boolean;
  isDefault: boolean;
  pixKey: string;
  pixKeyType: string;
  beneficiary: string;
  city: string;
  description: string;
}

export default function BanksPage() {
  const [banks, setBanks] = useState<BankConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    pixKey: '',
    pixKeyType: 'ALEATORIA',
    beneficiary: '',
    city: 'SAO PAULO',
    isDefault: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBanks();
  }, []);

  async function fetchBanks() {
    try {
      const res = await fetch('/api/dashboard/banks');
      const data = await res.json();
      setBanks(data.banks || []);
    } catch {
      toast.error('Erro ao carregar bancos');
    } finally {
      setLoading(false);
    }
  }

  const handleStartEdit = (bank: BankConfigItem) => {
    setEditingCode(bank.code);
    setEditForm({
      pixKey: bank.pixKey || '',
      pixKeyType: bank.pixKeyType || 'ALEATORIA',
      beneficiary: bank.beneficiary || '',
      city: bank.city || 'SAO PAULO',
      isDefault: bank.isDefault,
    });
  };

  const handleSave = async (code: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/dashboard/banks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          ...editForm,
        }),
      });

      if (!res.ok) throw new Error('Erro ao salvar');
      toast.success('Configurações do banco salvas com sucesso!');
      setEditingCode(null);
      fetchBanks();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-surface-800">Bancos & Gateways de Pagamento</h2>
          <p className="text-surface-500 text-sm mt-0.5">
            Configure suas contas bancárias e chaves PIX para gerar links de pagamento por qualquer banco
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full glass-card p-12 text-center">
            <div className="w-8 h-8 rounded-full border-4 border-primary-200 border-t-primary-600 animate-spin mx-auto" />
            <p className="text-surface-400 text-sm mt-3">Carregando bancos...</p>
          </div>
        ) : (
          banks.map((bank) => {
            const isEditing = editingCode === bank.code;
            return (
              <div
                key={bank.code}
                className={`glass-card p-6 transition-all relative ${
                  bank.isDefault ? 'border-2 border-primary-500 shadow-md' : ''
                }`}
              >
                {bank.isDefault && (
                  <span className="absolute -top-3 right-4 bg-primary-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                    ★ Banco Padrão
                  </span>
                )}

                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{bank.icon}</span>
                  <div>
                    <h3 className="font-bold text-surface-800 text-base">{bank.name}</h3>
                    <span className={`badge ${bank.badgeColor} text-xs mt-0.5`}>
                      {bank.code === 'mercadopago' ? 'Gateway API Oficial' : 'PIX Direto BACEN'}
                    </span>
                  </div>
                </div>

                <p className="text-surface-500 text-xs mb-4 min-h-[32px]">{bank.description}</p>

                {isEditing ? (
                  <div className="space-y-3 pt-3 border-t border-surface-100 animate-fade-in">
                    <div>
                      <label className="block text-xs font-semibold text-surface-600 mb-1">
                        Chave PIX da Conta
                      </label>
                      <input
                        type="text"
                        value={editForm.pixKey}
                        onChange={(e) => setEditForm({ ...editForm, pixKey: e.target.value })}
                        className="input-field text-xs py-2"
                        placeholder="CPF, CNPJ, Celular, E-mail ou Chave Aleatória"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-surface-600 mb-1">
                        Tipo de Chave
                      </label>
                      <select
                        value={editForm.pixKeyType}
                        onChange={(e) => setEditForm({ ...editForm, pixKeyType: e.target.value })}
                        className="input-field text-xs py-2"
                      >
                        <option value="CPF">CPF</option>
                        <option value="CNPJ">CNPJ</option>
                        <option value="EMAIL">E-mail</option>
                        <option value="PHONE">Telefone</option>
                        <option value="ALEATORIA">Chave Aleatória</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-surface-600 mb-1">
                        Nome do Titular da Conta
                      </label>
                      <input
                        type="text"
                        value={editForm.beneficiary}
                        onChange={(e) => setEditForm({ ...editForm, beneficiary: e.target.value })}
                        className="input-field text-xs py-2"
                        placeholder="Nome que aparece no comprovante"
                      />
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-surface-700 pt-1">
                      <input
                        type="checkbox"
                        checked={editForm.isDefault}
                        onChange={(e) => setEditForm({ ...editForm, isDefault: e.target.checked })}
                        className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
                      />
                      <span>Tornar banco padrão para novos links</span>
                    </label>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => handleSave(bank.code)}
                        disabled={saving}
                        className="btn-primary py-2 px-3 text-xs flex-1 font-bold"
                      >
                        {saving ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCode(null)}
                        className="btn-secondary py-2 px-3 text-xs font-semibold"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-3 border-t border-surface-100">
                    <div className="space-y-1 text-xs text-surface-500 mb-4">
                      <p>
                        <span className="font-semibold text-surface-700">Chave PIX:</span>{' '}
                        {bank.pixKey ? (
                          <span className="font-mono text-surface-800 bg-surface-50 px-1.5 py-0.5 rounded">
                            {bank.pixKey}
                          </span>
                        ) : (
                          <span className="text-surface-400 italic">Usando chave padrão do sistema</span>
                        )}
                      </p>
                      {bank.beneficiary && (
                        <p>
                          <span className="font-semibold text-surface-700">Titular:</span> {bank.beneficiary}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStartEdit(bank)}
                      className="btn-secondary w-full text-xs py-2 font-semibold hover:border-primary-400"
                    >
                      ⚙️ Configurar Chave / Conta
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

