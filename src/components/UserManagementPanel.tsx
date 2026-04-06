import React, { useState, useEffect } from 'react';
import { ShieldAlert, ShieldCheck, UserPlus, Trash2, Users, Loader2, Key } from 'lucide-react';
import { maonoApi } from '../services/api';

export function UserManagementPanel() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados do Formulário
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('VIEWER');
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Pega a Chave Mestra do navegador
  const token = localStorage.getItem("@maono:token") || "";

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await maonoApi.getUsers(token);
      setUsers(data.users || []);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setMessage({ type: '', text: '' });

    try {
      await maonoApi.createUser(token, { email, password, role });
      setMessage({ type: 'success', text: 'Usuário criado com sucesso!' });
      setEmail('');
      setPassword('');
      setRole('VIEWER');
      fetchUsers(); // Atualiza a lista
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteUser = async (id: string, userEmail: string) => {
    if (!window.confirm(`ATENÇÃO: Tem certeza que deseja excluir o acesso de ${userEmail}? Todos os projetos dele serão apagados.`)) return;
    
    try {
      await maonoApi.deleteUser(token, id);
      fetchUsers();
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#020305] text-white p-8 overflow-y-auto maono-scroll">
      
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-8 pb-6 border-b border-[#1f2b3e]">
        <div className="p-3 bg-[#C5A059]/10 rounded-xl border border-[#C5A059]/30">
          <ShieldAlert className="w-8 h-8 text-[#C5A059]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-100 tracking-wide">Gestão de Acessos</h1>
          <p className="text-sm text-[#8c9fba] mt-1">Área restrita. Apenas usuários MASTER possuem acesso a este painel.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUNA ESQUERDA: FORMULÁRIO DE CRIAÇÃO */}
        <div className="lg:col-span-1">
          <div className="bg-[#0a0f18] border border-[#1f2b3e] rounded-xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#C5A059] to-transparent"></div>
            
            <h2 className="text-sm font-bold text-[#C5A059] uppercase tracking-widest mb-6 flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> Novo Cliente
            </h2>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#8c9fba] mb-1">E-mail Corporativo</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-[#131c2a] border border-[#1f2b3e] rounded-lg px-4 py-2.5 text-sm focus:border-[#C5A059] focus:outline-none transition-colors" placeholder="cliente@empresa.com" />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-[#8c9fba] mb-1">Senha Provisória</label>
                <input type="text" required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-[#131c2a] border border-[#1f2b3e] rounded-lg px-4 py-2.5 text-sm focus:border-[#C5A059] focus:outline-none transition-colors" placeholder="Senha123!" />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8c9fba] mb-1">Nível de Acesso (Role)</label>
                <select value={role} onChange={e => setRole(e.target.value)} className="w-full bg-[#131c2a] border border-[#1f2b3e] rounded-lg px-4 py-2.5 text-sm focus:border-[#C5A059] focus:outline-none transition-colors text-white">
                  <option value="VIEWER">Visualizador (VIEWER)</option>
                  <option value="EDITOR">Editor (EDITOR)</option>
                  <option value="MASTER">Mestre (MASTER)</option>
                </select>
              </div>

              {message.text && (
                <div className={`p-3 rounded-lg text-xs font-bold text-center ${message.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/30'}`}>
                  {message.text}
                </div>
              )}

              <button type="submit" disabled={isCreating} className="w-full mt-4 py-3 bg-[#C5A059] hover:bg-[#E2C275] text-[#0a0f18] text-xs font-extrabold uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                Gerar Acesso
              </button>
            </form>
          </div>
        </div>

        {/* COLUNA DIREITA: LISTA DE USUÁRIOS */}
        <div className="lg:col-span-2">
          <div className="bg-[#0a0f18] border border-[#1f2b3e] rounded-xl p-6 shadow-xl h-full flex flex-col">
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#8c9fba]" /> Contas Ativas
            </h2>

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#C5A059] animate-spin" />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-2 maono-scroll space-y-3">
                {users.map(user => (
                  <div key={user.id} className="flex items-center justify-between p-4 bg-[#131c2a] border border-[#1f2b3e] rounded-xl hover:border-[#C5A059]/50 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${user.role === 'MASTER' ? 'bg-[#C5A059] text-[#0a0f18]' : 'bg-[#1a2435] text-[#8c9fba]'}`}>
                        {user.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-200">{user.email}</p>
                        <p className="text-xs text-[#64748b] font-mono mt-0.5">Criado em: {new Date(user.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {/* Badge do Cargo */}
                      <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold tracking-widest flex items-center gap-1 ${user.role === 'MASTER' ? 'bg-[#C5A059]/20 text-[#C5A059] border border-[#C5A059]/50' : user.role === 'EDITOR' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' : 'bg-gray-500/10 text-gray-400 border border-gray-500/30'}`}>
                        {user.role === 'MASTER' && <ShieldCheck className="w-3 h-3" />}
                        {user.role}
                      </span>
                      
                      {/* Botão de Excluir */}
                      <button onClick={() => handleDeleteUser(user.id, user.email)} className="p-2 text-[#64748b] hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all" title="Revogar Acesso">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}