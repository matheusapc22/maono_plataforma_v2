import React, { useState, useEffect } from 'react';
import { Users, Shield, UserPlus, Mail, Trash2, X, CheckCircle2, Building2 } from 'lucide-react';

export function UserManagementPanel() {
  const [users, setUsers] = useState<any[]>([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'USER' });

  // MOCK INICIAL (Enquanto o backend não é plugado via fetch)
  useEffect(() => {
    setUsers([
      { id: '1', name: 'Admin Principal', email: 'admin@empresa.com', role: 'ADMIN', status: 'Ativo' },
      { id: '2', name: 'Analista de Dados', email: 'analista@empresa.com', role: 'USER', status: 'Pendente' }
    ]);
  }, []);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email) return;
    
    // Simula a adição (Aqui entraria o fetch POST /api/app/users)
    setUsers([{ id: Date.now().toString(), ...newUser, status: 'Ativo' }, ...users]);
    setNewUser({ name: '', email: '', role: 'USER' });
    setIsInviteModalOpen(false);
  };

  const handleRemove = (id: string) => {
    // Simula remoção (Aqui entraria o fetch DELETE /api/app/users/:id)
    setUsers(users.filter(u => u.id !== id));
  };

  return (
    <div className="w-full h-full relative text-white flex flex-col bg-[#020305]">
      <div className="flex-1 p-8 overflow-y-auto maono-scroll border-r border-[#161f30]">
        
        {/* CABEÇALHO */}
        <div className="flex items-center justify-between mb-10 border-b border-[#1f2b3e] pb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#C5A059]/10 rounded-xl">
              <Building2 className="text-[#C5A059] w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Gestão da Organização</h2>
              <p className="text-[#64748b] text-xs">Controle de acessos e permissões da sua equipe</p>
            </div>
          </div>

          <button 
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#C5A059] hover:bg-[#E2C275] text-[#04060a] text-xs font-bold uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(197,160,89,0.2)]"
          >
            <UserPlus className="w-4 h-4" /> Convidar Membro
          </button>
        </div>

        {/* CARDS DE RESUMO */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-[#0a0f18] p-6 rounded-2xl border border-[#1f2b3e] flex items-center gap-4">
            <div className="p-3 bg-[#131c2a] rounded-full text-[#8c9fba]"><Users className="w-6 h-6" /></div>
            <div><p className="text-xs text-[#64748b] font-bold uppercase tracking-wider">Total de Membros</p><p className="text-2xl font-bold text-white">{users.length}</p></div>
          </div>
          <div className="bg-[#0a0f18] p-6 rounded-2xl border border-[#1f2b3e] flex items-center gap-4">
            <div className="p-3 bg-[#C5A059]/10 rounded-full text-[#C5A059]"><Shield className="w-6 h-6" /></div>
            <div><p className="text-xs text-[#64748b] font-bold uppercase tracking-wider">Administradores</p><p className="text-2xl font-bold text-white">{users.filter(u => u.role === 'ADMIN').length}</p></div>
          </div>
        </div>

        {/* TABELA DE USUÁRIOS */}
        <div className="bg-[#0a0f18] border border-[#1f2b3e] rounded-2xl overflow-hidden shadow-lg">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#131c2a] text-[#8c9fba] text-[10px] uppercase font-bold tracking-wider border-b border-[#1f2b3e]">
              <tr>
                <th className="px-6 py-4">Usuário</th>
                <th className="px-6 py-4">Papel (Role)</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f2b3e]">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-[#131c2a]/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#1f2b3e] to-[#131c2a] flex items-center justify-center text-xs font-bold text-[#8c9fba] border border-[#1f2b3e]">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-white font-medium">{user.name}</p>
                        <p className="text-[#64748b] text-xs flex items-center gap-1"><Mail className="w-3 h-3" /> {user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded-md border ${user.role === 'ADMIN' ? 'bg-[#C5A059]/10 text-[#C5A059] border-[#C5A059]/30' : 'bg-[#1f2b3e]/50 text-[#8c9fba] border-[#1f2b3e]'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1.5 text-xs text-[#11A872]"><CheckCircle2 className="w-3.5 h-3.5" /> {user.status}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleRemove(user.id)} className="p-2 text-[#64748b] hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all" title="Remover Usuário">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE CONVITE */}
      {isInviteModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#020305]/80 backdrop-blur-sm">
          <div className="w-[450px] bg-[#0a0f18] border border-[#C5A059]/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-[#1f2b3e] flex justify-between items-center bg-[#131c2a]">
              <div className="flex items-center gap-3"><UserPlus className="w-5 h-5 text-[#C5A059]" /><h3 className="font-bold tracking-widest uppercase text-xs text-white">Convidar para Organização</h3></div>
              <button onClick={() => setIsInviteModalOpen(false)} className="text-[#64748b] hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleInvite} className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] uppercase font-bold text-[#8c9fba] mb-2">Nome Completo</label>
                <input required type="text" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full bg-[#131c2a] border border-[#1f2b3e] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#C5A059]" placeholder="Ex: Carlos Silva" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-[#8c9fba] mb-2">E-mail Corporativo</label>
                <input required type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full bg-[#131c2a] border border-[#1f2b3e] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#C5A059]" placeholder="carlos@empresa.com" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-[#8c9fba] mb-2">Nível de Acesso (Role)</label>
                <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="w-full bg-[#131c2a] border border-[#1f2b3e] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#C5A059]">
                  <option value="USER">Usuário (Apenas Visualiza)</option>
                  <option value="ADMIN">Administrador (Total Acesso)</option>
                </select>
              </div>
              
              <div className="pt-4 border-t border-[#1f2b3e] flex justify-end gap-3">
                <button type="button" onClick={() => setIsInviteModalOpen(false)} className="px-5 py-2.5 text-[#8c9fba] hover:text-white text-xs font-bold uppercase tracking-wider">Cancelar</button>
                <button type="submit" className="px-6 py-2.5 bg-[#C5A059] hover:bg-[#E2C275] text-[#04060a] rounded-xl text-xs font-bold uppercase tracking-wider transition-all">Enviar Convite</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}