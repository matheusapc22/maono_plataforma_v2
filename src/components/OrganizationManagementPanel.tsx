import React, { useState, useEffect } from 'react';
import { Building2, Users, Power, PowerOff, Plus, Loader2, ShieldAlert } from 'lucide-react';
import { maonoApi } from '../services/api';

export default function OrganizationManagementPanel() {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Estados do Modal de Nova Empresa
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgLimit, setNewOrgLimit] = useState(5);
  const [isCreating, setIsCreating] = useState(false);
  
  // Estado para loading individual dos botões de status
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const token = localStorage.getItem('@maono:token') || '';

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const data = await maonoApi.getOrganizations(token);
      setOrganizations(data.organizations);
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar empresas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await maonoApi.createOrganization(token, { name: newOrgName, max_users: newOrgLimit });
      setIsModalOpen(false);
      setNewOrgName('');
      setNewOrgLimit(5);
      fetchOrganizations(); // Recarrega a lista
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleStatus = async (orgId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const confirmMessage = newStatus === 'SUSPENDED' 
      ? 'Tem certeza que deseja SUSPENDER o acesso de toda essa empresa?' 
      : 'Deseja ATIVAR o acesso dessa empresa?';
      
    if (!window.confirm(confirmMessage)) return;

    setActionLoading(orgId);
    try {
      await maonoApi.updateOrganizationStatus(token, orgId, newStatus);
      fetchOrganizations(); // Recarrega a lista
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="w-full h-full bg-[#020305] text-white p-6 md:p-10 overflow-y-auto">
      
      {/* HEADER DO PAINEL */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-widest uppercase text-white flex items-center gap-3">
            <ShieldAlert className="text-[#C5A059] w-7 h-7" />
            Painel do CEO
          </h1>
          <p className="text-[#8c9fba] text-sm mt-1 uppercase tracking-wider">Gestão de Clientes e Contratos B2B</p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-gradient-to-r from-[#C5A059] to-[#96783d] hover:from-[#e3c47d] hover:to-[#C5A059] text-[#04060a] px-6 py-3 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(197,160,89,0.3)]"
        >
          <Plus className="w-4 h-4" />
          Nova Empresa
        </button>
      </div>

      {/* MENSAGEM DE ERRO */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* LISTAGEM DE EMPRESAS */}
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="w-8 h-8 text-[#C5A059] animate-spin" />
        </div>
      ) : (
        <div className="bg-[#0a0f18] border border-[#1f2b3e] rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#131c2a] border-b border-[#1f2b3e]">
                  <th className="p-4 text-xs font-bold text-[#8c9fba] uppercase tracking-wider">Empresa</th>
                  <th className="p-4 text-xs font-bold text-[#8c9fba] uppercase tracking-wider">Uso de Licenças</th>
                  <th className="p-4 text-xs font-bold text-[#8c9fba] uppercase tracking-wider">Status</th>
                  <th className="p-4 text-xs font-bold text-[#8c9fba] uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2b3e]">
                {organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-[#131c2a]/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#1f2b3e] rounded-lg">
                          <Building2 className="w-4 h-4 text-[#C5A059]" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{org.name}</p>
                          <p className="text-[10px] text-[#64748b] uppercase tracking-wider font-mono mt-0.5">{org.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#8c9fba]" />
                        <span className="text-sm font-medium">
                          <span className={org.current_users >= org.max_users ? 'text-red-400' : 'text-white'}>
                            {org.current_users}
                          </span>
                          <span className="text-[#64748b]"> / {org.max_users}</span>
                        </span>
                      </div>
                      {/* Barra de Progresso Visual */}
                      <div className="w-24 h-1.5 bg-[#1f2b3e] rounded-full mt-2 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${org.current_users >= org.max_users ? 'bg-red-500' : 'bg-[#C5A059]'}`}
                          style={{ width: `${Math.min((org.current_users / org.max_users) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        org.status === 'ACTIVE' 
                          ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {org.status === 'ACTIVE' ? 'Ativo' : 'Suspenso'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(org.id, org.status)}
                        disabled={actionLoading === org.id}
                        className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                          org.status === 'ACTIVE'
                            ? 'bg-[#131c2a] text-red-400 border-red-400/30 hover:bg-red-500/10 hover:border-red-400'
                            : 'bg-[#131c2a] text-green-400 border-green-400/30 hover:bg-green-500/10 hover:border-green-400'
                        } disabled:opacity-50`}
                      >
                        {actionLoading === org.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : org.status === 'ACTIVE' ? (
                          <><PowerOff className="w-3 h-3" /> Suspender</>
                        ) : (
                          <><Power className="w-3 h-3" /> Ativar</>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
                {organizations.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-[#64748b] text-sm">
                      Nenhuma organização cadastrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DE CRIAÇÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a0f18] border border-[#1f2b3e] rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-wider">Cadastrar Nova Empresa</h2>
            <form onSubmit={handleCreateOrganization} className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-[#8c9fba] uppercase tracking-wider mb-2">Nome da Empresa</label>
                <input 
                  type="text" 
                  required
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="w-full bg-[#131c2a] border border-[#1f2b3e] text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all"
                  placeholder="Ex: Maõno Tecnologia HQ"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#8c9fba] uppercase tracking-wider mb-2">Limite de Usuários no Contrato</label>
                <input 
                  type="number" 
                  min="1"
                  required
                  value={newOrgLimit}
                  onChange={(e) => setNewOrgLimit(Number(e.target.value))}
                  className="w-full bg-[#131c2a] border border-[#1f2b3e] text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all"
                />
              </div>
              <div className="flex gap-3 mt-8">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 bg-[#131c2a] hover:bg-[#1f2b3e] text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 py-3 bg-[#C5A059] hover:bg-[#E2C275] text-[#04060a] text-xs font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Contrato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}