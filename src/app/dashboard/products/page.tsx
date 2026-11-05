'use client';

import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';

interface Price {
  id: string;
  amount: number;
  type: string;
  interval: string | null;
  intervalCount: number | null;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  active: boolean;
  deliveryType?: string;
  deliveryUrl?: string | null;
  deliveryFileName?: string | null;
  deliveryFileSize?: number | null;
  deliveryContent?: string | null;
  deliveryInstructions?: string | null;
  notifyEmail?: boolean;
  notifyWhatsapp?: boolean;
  prices: Price[];
  _count: { payments: number; paymentLinks: number };
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const formatFileSize = (bytes?: number | null) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Upload States
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const initialForm = {
    name: '',
    description: '',
    imageUrl: '',
    prices: [{ amount: 0, type: 'ONE_TIME', interval: '', intervalCount: 1 }],
    deliveryType: 'DOWNLOAD', // 'DOWNLOAD' | 'ACCESS_LINK' | 'VIDEO' | 'CUSTOM_TEXT' | 'NONE'
    deliveryUrl: '',
    deliveryFileName: '',
    deliveryFileSize: 0,
    deliveryContent: '',
    deliveryInstructions: '',
    notifyEmail: true,
    notifyWhatsapp: true,
  };

  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      const res = await fetch('/api/dashboard/products');
      const data = await res.json();
      setProducts(data.products || []);
    } catch {} finally {
      setLoading(false);
    }
  }

  // Upload de Arquivo do Infoproduto (PDF, Documento, Vídeo, Zip)
  async function handleFileUpload(file: File, isEdit = false) {
    try {
      setUploadingFile(true);
      const data = new FormData();
      data.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: data,
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || 'Erro ao enviar arquivo');

      toast.success(`Arquivo "${file.name}" carregado com sucesso!`);

      if (isEdit && editingProduct) {
        setEditingProduct({
          ...editingProduct,
          deliveryUrl: resJson.url,
          deliveryFileName: resJson.fileName,
          deliveryFileSize: resJson.fileSize,
          deliveryType: 'DOWNLOAD',
        });
      } else {
        setFormData((prev) => ({
          ...prev,
          deliveryUrl: resJson.url,
          deliveryFileName: resJson.fileName,
          deliveryFileSize: resJson.fileSize,
          deliveryType: 'DOWNLOAD',
        }));
      }
    } catch (err: any) {
      toast.error(err.message || 'Falha no upload do arquivo');
    } finally {
      setUploadingFile(false);
    }
  }

  // Upload de Imagem de Capa do Produto
  async function handleImageUpload(file: File, isEdit = false) {
    try {
      setUploadingImage(true);
      const data = new FormData();
      data.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: data,
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || 'Erro ao enviar imagem');

      toast.success('Imagem de capa atualizada!');

      if (isEdit && editingProduct) {
        setEditingProduct({
          ...editingProduct,
          imageUrl: resJson.url,
        });
      } else {
        setFormData((prev) => ({
          ...prev,
          imageUrl: resJson.url,
        }));
      }
    } catch (err: any) {
      toast.error(err.message || 'Falha no upload da imagem');
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/dashboard/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Erro ao criar produto');
      toast.success('Produto e infoproduto cadastrados com sucesso!');
      setShowForm(false);
      setFormData(initialForm);
      fetchProducts();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleUpdateProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      const res = await fetch(`/api/dashboard/products/${editingProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingProduct.name,
          description: editingProduct.description,
          imageUrl: editingProduct.imageUrl,
          deliveryType: editingProduct.deliveryType,
          deliveryUrl: editingProduct.deliveryUrl,
          deliveryFileName: editingProduct.deliveryFileName,
          deliveryFileSize: editingProduct.deliveryFileSize,
          deliveryContent: editingProduct.deliveryContent,
          deliveryInstructions: editingProduct.deliveryInstructions,
          notifyEmail: editingProduct.notifyEmail,
          notifyWhatsapp: editingProduct.notifyWhatsapp,
        }),
      });
      if (!res.ok) throw new Error('Erro ao atualizar produto');
      toast.success('Produto atualizado com sucesso!');
      setEditingProduct(null);
      fetchProducts();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  const addPrice = () => {
    setFormData({
      ...formData,
      prices: [...formData.prices, { amount: 0, type: 'ONE_TIME', interval: '', intervalCount: 1 }],
    });
  };

  const removePrice = (index: number) => {
    setFormData({
      ...formData,
      prices: formData.prices.filter((_, i) => i !== index),
    });
  };

  const updatePrice = (index: number, field: string, value: any) => {
    const newPrices = [...formData.prices];
    (newPrices[index] as any)[field] = value;
    setFormData({ ...formData, prices: newPrices });
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Deseja excluir este produto?')) return;
    try {
      const res = await fetch(`/api/dashboard/products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Produto excluído com sucesso');
      fetchProducts();
    } catch {
      toast.error('Erro ao excluir produto');
    }
  };

  const getDeliveryBadge = (type?: string) => {
    switch (type) {
      case 'DOWNLOAD':
        return { label: '📥 Download de Arquivo / PDF', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'VIDEO':
        return { label: '🎬 Vídeo / Aulas', bg: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 'ACCESS_LINK':
        return { label: '🎓 Curso / Área VIP', bg: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'CUSTOM_TEXT':
        return { label: '🔑 Chave / Acesso', bg: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'NONE':
        return { label: '⚪ Sem Entrega', bg: 'bg-gray-100 text-gray-700 border-gray-200' };
      default:
        return { label: '📦 Infoproduto', bg: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
    }
  };

  if (loading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="glass-card p-6 space-y-3">
            <div className="skeleton h-6 w-32 rounded" />
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-10 w-24 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header com Botão de Destaque para Cadastro e Upload */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 glass-card bg-gradient-to-r from-blue-50/50 via-white to-emerald-50/50 border border-blue-100">
        <div>
          <h2 className="text-2xl font-bold text-surface-800 flex items-center gap-2">
            <span>📦</span> Cadastro de Produtos & Infoprodutos
          </h2>
          <p className="text-surface-500 text-sm mt-1">
            Faça upload direto de <strong>PDFs, documentos, vídeos ou cursos</strong> e ative a entrega automática via WhatsApp e E-mail.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/dashboard/whatsapp"
            className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 transition-colors flex items-center gap-1.5"
          >
            <span>💬</span> Conectar WhatsApp (QR)
          </a>
          <button
            onClick={() => {
              setEditingProduct(null);
              setShowForm(!showForm);
              if (!showForm) {
                window.scrollTo({ top: 120, behavior: 'smooth' });
              }
            }}
            className="btn-primary flex items-center gap-2 px-5 py-2.5 shadow-md hover:shadow-lg"
          >
            {showForm ? '✕ Fechar Formulário' : '📁 + Cadastrar Produto & Fazer Upload'}
          </button>
        </div>
      </div>

      {/* FORMULÁRIO DE CADASTRO COM UPLOAD DIRETO */}
      {showForm && (
        <div className="glass-card p-6 sm:p-8 shadow-2xl border-2 border-primary-200 animate-slide-up">
          <div className="mb-6 pb-4 border-b border-surface-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-surface-800 text-lg">
                Cadastrar Novo Produto / Infoproduto
              </h3>
              <p className="text-xs text-surface-500">
                Selecione o arquivo do seu computador ou informe o link da sua área de membros.
              </p>
            </div>
            <button
              onClick={() => setShowForm(false)}
              className="text-surface-400 hover:text-surface-700 text-sm font-semibold p-1"
            >
              ✕ Cancelar
            </button>
          </div>

          <form onSubmit={handleCreateProduct} className="space-y-6">
            {/* Informações Básicas */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">Nome do Produto</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="Ex: E-book Método Tráfego Lucrativo (PDF)"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">Descrição</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field"
                  placeholder="Resumo do conteúdo que o cliente vai receber"
                />
              </div>
            </div>

            {/* Upload de Imagem de Capa do Produto */}
            <div className="p-4 bg-surface-50 rounded-xl border border-surface-200">
              <label className="block text-xs font-semibold text-surface-700 mb-2">
                Imagem de Capa / Mockup do Produto (Opcional)
              </label>
              <div className="flex items-center gap-4">
                {formData.imageUrl ? (
                  <div className="relative group">
                    <img
                      src={formData.imageUrl}
                      alt="Capa do Produto"
                      className="w-16 h-16 rounded-xl object-cover border border-surface-200"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, imageUrl: '' })}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-surface-100 border-2 border-dashed border-surface-300 flex items-center justify-center text-2xl text-surface-400">
                    🖼️
                  </div>
                )}
                <div>
                  <input
                    type="file"
                    ref={imageInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file, false);
                    }}
                  />
                  <button
                    type="button"
                    disabled={uploadingImage}
                    onClick={() => imageInputRef.current?.click()}
                    className="btn-secondary text-xs px-3 py-1.5"
                  >
                    {uploadingImage ? 'Enviando imagem...' : '📸 Selecionar Imagem de Capa'}
                  </button>
                  <p className="text-[11px] text-surface-400 mt-1">PNG, JPG ou WEBP até 10MB.</p>
                </div>
              </div>
            </div>

            {/* Preços & Cobrança */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-surface-700">Preços & Cobrança</label>
                <button type="button" onClick={addPrice} className="text-xs text-primary-600 hover:text-primary-700 font-semibold">
                  + Adicionar outro preço
                </button>
              </div>
              {formData.prices.map((price, idx) => (
                <div key={idx} className="flex gap-3 mb-2 items-end">
                  <div className="flex-1">
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={price.amount || ''}
                      onChange={(e) => updatePrice(idx, 'amount', parseFloat(e.target.value))}
                      className="input-field"
                      placeholder="Valor (R$)"
                    />
                  </div>
                  <div className="w-40">
                    <select
                      value={price.type}
                      onChange={(e) => updatePrice(idx, 'type', e.target.value)}
                      className="input-field"
                    >
                      <option value="ONE_TIME">Pagamento Único</option>
                      <option value="RECURRING">Recorrente (Assinatura)</option>
                    </select>
                  </div>
                  {price.type === 'RECURRING' && (
                    <div className="w-32">
                      <select
                        value={price.interval || 'month'}
                        onChange={(e) => updatePrice(idx, 'interval', e.target.value)}
                        className="input-field"
                      >
                        <option value="month">Mensal</option>
                        <option value="year">Anual</option>
                      </select>
                    </div>
                  )}
                  {formData.prices.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePrice(idx)}
                      className="p-3 text-red-500 hover:bg-red-50 rounded-xl"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* SEÇÃO PRINCIPAL: UPLOAD E ENTREGA DO INFOPRODUTO */}
            <div className="p-5 sm:p-6 bg-gradient-to-br from-emerald-50/70 via-blue-50/40 to-indigo-50/60 rounded-2xl border-2 border-emerald-300 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-xl shadow-md">
                    📥
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-surface-900">
                      Arquivo do Infoproduto (Upload Direto)
                    </h4>
                    <p className="text-xs text-surface-500">
                      Faça o upload do seu PDF, documento, vídeo ou zip. O comprador receberá o arquivo no WhatsApp e E-mail.
                    </p>
                  </div>
                </div>
                <span className="hidden sm:inline-block text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full uppercase">
                  Supabase Storage
                </span>
              </div>

              {/* Box de Upload Drag & Drop */}
              <div className="p-6 bg-white rounded-2xl border-2 border-dashed border-emerald-300 hover:border-emerald-400 transition-colors text-center space-y-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.zip,.rar,.mp4,.epub,.txt,.xlsx,.pptx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, false);
                  }}
                />

                {formData.deliveryUrl ? (
                  <div className="space-y-3 animate-fade-in">
                    <div className="inline-flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-left">
                      <span className="text-3xl">📄</span>
                      <div>
                        <p className="text-xs font-bold text-emerald-900">
                          {formData.deliveryFileName || 'Arquivo Carregado'}
                        </p>
                        <p className="text-[11px] text-emerald-700">
                          {formatFileSize(formData.deliveryFileSize)} • Armazenado no Supabase Storage
                        </p>
                      </div>
                      <span className="text-xs bg-emerald-200 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                        ✓ Pronto
                      </span>
                    </div>

                    <div className="flex items-center justify-center gap-3 text-xs">
                      <a
                        href={formData.deliveryUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary-600 hover:underline font-semibold"
                      >
                        ↗ Testar Download do Arquivo
                      </a>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-surface-600 hover:underline font-semibold"
                      >
                        Substituir Arquivo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-2xl mb-2">
                      📁
                    </div>
                    <p className="font-bold text-sm text-surface-800">
                      Clique no botão para escolher seu PDF ou arquivo do computador
                    </p>
                    <p className="text-xs text-surface-400 mt-0.5">
                      Suporta PDF, Word, Excel, ZIP, RAR, MP4 e ePub até 100MB.
                    </p>
                    <div className="mt-4">
                      <button
                        type="button"
                        disabled={uploadingFile}
                        onClick={() => fileInputRef.current?.click()}
                        className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all disabled:opacity-50 inline-flex items-center gap-2"
                      >
                        {uploadingFile ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Fazendo Upload para a Nuvem...
                          </>
                        ) : (
                          <>
                            <span>⬆️</span> Selecionar Arquivo do Computador
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Ou link externo */}
              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">
                    Tipo de Entrega
                  </label>
                  <select
                    value={formData.deliveryType}
                    onChange={(e) => setFormData({ ...formData, deliveryType: e.target.value })}
                    className="input-field bg-white"
                  >
                    <option value="DOWNLOAD">📥 Download de Arquivo / PDF (Upload ou Link)</option>
                    <option value="ACCESS_LINK">🎓 Curso / Área de Membros / Plataforma Externa</option>
                    <option value="VIDEO">🎬 Vídeo / Aulas Exclusivas (Vimeo, YouTube, Drive)</option>
                    <option value="CUSTOM_TEXT">🔑 Chave de Licença / Senhas / Texto</option>
                    <option value="NONE">⚪ Apenas Cobrança (Sem entrega de conteúdo)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">
                    URL do Conteúdo (Preenchido pelo Upload ou Manual)
                  </label>
                  <input
                    type="url"
                    value={formData.deliveryUrl}
                    onChange={(e) => setFormData({ ...formData, deliveryUrl: e.target.value })}
                    className="input-field bg-white font-mono text-xs"
                    placeholder="https://... (preenchido no upload acima ou cole aqui)"
                  />
                </div>
              </div>

              {/* Chaves de Acesso / Instruções */}
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Chaves de Acesso / Senhas / Dados de Login (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={formData.deliveryContent}
                  onChange={(e) => setFormData({ ...formData, deliveryContent: e.target.value })}
                  className="input-field bg-white font-mono text-xs"
                  placeholder="Ex: Seu código de ativação: VIP-7788 | Login: seu email cadastrado"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Instruções Adicionais para o Comprador (Opcional)
                </label>
                <input
                  type="text"
                  value={formData.deliveryInstructions}
                  onChange={(e) => setFormData({ ...formData, deliveryInstructions: e.target.value })}
                  className="input-field bg-white"
                  placeholder="Ex: Baixe o arquivo PDF e salve em seu dispositivo para acesso permanente."
                />
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-emerald-100 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-surface-700">
                  <input
                    type="checkbox"
                    checked={formData.notifyEmail}
                    onChange={(e) => setFormData({ ...formData, notifyEmail: e.target.checked })}
                    className="w-4 h-4 text-primary-600 rounded"
                  />
                  ✉️ Enviar automaticamente por E-mail
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-surface-700">
                  <input
                    type="checkbox"
                    checked={formData.notifyWhatsapp}
                    onChange={(e) => setFormData({ ...formData, notifyWhatsapp: e.target.checked })}
                    className="w-4 h-4 text-primary-600 rounded"
                  />
                  💬 Enviar automaticamente para o WhatsApp
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button type="submit" className="btn-primary px-8">
                Salvar Produto e Ativar Entrega
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL / PAINEL DE EDIÇÃO DE PRODUTO */}
      {editingProduct && (
        <div className="glass-card p-6 sm:p-8 border-2 border-primary-300 shadow-2xl animate-slide-up">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-surface-100">
            <div>
              <h3 className="font-bold text-surface-800 text-lg">
                Editar Produto: <span className="text-primary-600">{editingProduct.name}</span>
              </h3>
              <p className="text-xs text-surface-500">Altere informações ou faça upload de uma nova versão do arquivo.</p>
            </div>
            <button
              onClick={() => setEditingProduct(null)}
              className="text-surface-400 hover:text-surface-700 text-sm font-semibold p-1"
            >
              ✕ Fechar
            </button>
          </div>

          <form onSubmit={handleUpdateProduct} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">Nome do Produto</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">Descrição</label>
                <input
                  type="text"
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>

            {/* Upload do Arquivo no Editar */}
            <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900">Arquivo do Infoproduto</span>
                <input
                  type="file"
                  id="editFileInput"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.zip,.rar,.mp4,.epub,.txt"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, true);
                  }}
                />
                <button
                  type="button"
                  disabled={uploadingFile}
                  onClick={() => document.getElementById('editFileInput')?.click()}
                  className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
                >
                  {uploadingFile ? 'Carregando...' : '⬆️ Fazer Upload de Novo Arquivo'}
                </button>
              </div>

              {editingProduct.deliveryUrl && (
                <div className="flex items-center justify-between text-xs p-2.5 bg-white rounded-lg border border-emerald-200">
                  <div className="flex items-center gap-2 truncate">
                    <span>📄</span>
                    <span className="font-semibold text-surface-800 truncate">
                      {editingProduct.deliveryFileName || editingProduct.deliveryUrl}
                    </span>
                    {editingProduct.deliveryFileSize && (
                      <span className="text-surface-400">({formatFileSize(editingProduct.deliveryFileSize)})</span>
                    )}
                  </div>
                  <a
                    href={editingProduct.deliveryUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary-600 font-bold hover:underline ml-2 whitespace-nowrap"
                  >
                    Baixar ↗
                  </a>
                </div>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">Tipo de Entrega</label>
                <select
                  value={editingProduct.deliveryType || 'DOWNLOAD'}
                  onChange={(e) => setEditingProduct({ ...editingProduct, deliveryType: e.target.value })}
                  className="input-field bg-white"
                >
                  <option value="DOWNLOAD">📥 Download de Arquivo / PDF</option>
                  <option value="ACCESS_LINK">🎓 Curso / Área de Membros</option>
                  <option value="VIDEO">🎬 Vídeo / Aulas Exclusivas</option>
                  <option value="CUSTOM_TEXT">🔑 Chave de Licença / Senhas</option>
                  <option value="NONE">⚪ Nenhum (Apenas Cobrança)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">Link de Acesso</label>
                <input
                  type="url"
                  value={editingProduct.deliveryUrl || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, deliveryUrl: e.target.value })}
                  className="input-field bg-white font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">Chaves / Senhas (Opcional)</label>
              <textarea
                rows={2}
                value={editingProduct.deliveryContent || ''}
                onChange={(e) => setEditingProduct({ ...editingProduct, deliveryContent: e.target.value })}
                className="input-field bg-white font-mono text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="btn-secondary text-sm"
              >
                Cancelar
              </button>
              <button type="submit" className="btn-primary text-sm px-6">
                Salvar Alterações
              </button>
            </div>
          </form>
        </div>
      )}

      {/* GRID DE PRODUTOS CADASTRADOS */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => {
          const badge = getDeliveryBadge(product.deliveryType);
          return (
            <div
              key={product.id}
              className="glass-card p-6 hover:shadow-card-hover transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-12 h-12 rounded-xl object-cover border border-surface-200 shadow-sm"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center text-xl shadow-sm">
                      📦
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${badge.bg}`}>
                      {badge.label}
                    </span>
                    <span className={`badge ${product.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {product.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>

                <h3 className="font-bold text-surface-800 text-base mb-1">{product.name}</h3>
                <p className="text-surface-500 text-xs mb-3 line-clamp-2">{product.description || 'Sem descrição'}</p>

                {/* Preços */}
                <div className="space-y-1.5 mb-3">
                  {product.prices.map((price) => (
                    <div key={price.id} className="flex items-center justify-between p-2 bg-surface-50 rounded-lg text-xs">
                      <span className="text-surface-500">
                        {price.type === 'RECURRING'
                          ? `${price.interval === 'month' ? 'Mensal' : 'Anual'}`
                          : 'Único'}
                      </span>
                      <span className="font-bold text-surface-800">{formatCurrency(price.amount)}</span>
                    </div>
                  ))}
                </div>

                {/* Arquivo / Link */}
                <div className="p-3 bg-surface-50 rounded-xl border border-surface-200/60 mb-4 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-surface-500 font-medium">Arquivo / Link:</span>
                    {product.deliveryUrl ? (
                      <a
                        href={product.deliveryUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary-600 font-bold hover:underline flex items-center gap-1 truncate max-w-[150px]"
                        title={product.deliveryFileName || product.deliveryUrl}
                      >
                        <span>📥</span> {product.deliveryFileName || 'Abrir Arquivo ↗'}
                      </a>
                    ) : (
                      <span className="text-surface-400">Nenhum arquivo</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-surface-500">Disparo Automático:</span>
                    <span className="text-surface-700 font-semibold">
                      {product.notifyEmail !== false && '✉️ Email '}{product.notifyWhatsapp !== false && '💬 WhatsApp'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center justify-between text-xs text-surface-400 pt-3 border-t border-surface-100">
                <div className="flex gap-2 text-[11px]">
                  <span>{product._count.payments} vendas</span>
                  <span>•</span>
                  <span>{product._count.paymentLinks} links</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setEditingProduct(product);
                      setShowForm(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    ✏️ Editar
                  </button>
                  <a
                    href="/dashboard/payment-links"
                    className="text-[11px] font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    + Criar Link
                  </a>
                  <button
                    onClick={() => handleDeleteProduct(product.id)}
                    className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded-lg"
                    title="Excluir produto"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {products.length === 0 && (
          <div className="col-span-full text-center py-16 text-surface-400 glass-card">
            <p className="text-6xl mb-3">📁</p>
            <p className="font-bold text-surface-800 text-lg">Nenhum produto cadastrado ainda</p>
            <p className="text-xs text-surface-500 mt-1 mb-5 max-w-md mx-auto">
              Clique no botão abaixo para cadastrar seu primeiro PDF, documento, vídeo ou curso com upload automático.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary text-sm px-6 py-2.5"
            >
              + Cadastrar Meu Primeiro Produto & Fazer Upload
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
