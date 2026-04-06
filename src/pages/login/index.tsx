import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Loader2, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react'; 
import LogoSimbolo from '../../assets/images/Logo_atual (2).png'; 
import { maonoApi } from '../../services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [showPassword, setShowPassword] = useState(false); 
  
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await maonoApi.login(email, password);
      
      if (data.token) {
        localStorage.setItem('@maono:token', data.token);
        navigate('/'); 
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao conectar. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#020305] flex items-center justify-center p-4">
      
      <div className="w-full max-w-md bg-[#0a0f18] border border-[#1f2b3e] rounded-2xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
        
        {/* Linha Dourada Premium no Topo */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#C5A059] to-transparent opacity-80"></div>

        {/* LOGO (Blindada contra interações) */}
        <div className="flex flex-col items-center mt-4 mb-8">
          <img 
            src={LogoSimbolo} 
            alt="Maõno Logo" 
            draggable="false"
            onContextMenu={(e) => e.preventDefault()}
            className="w-40 h-auto drop-shadow-[0_0_15px_rgba(197,160,89,0.3)] pointer-events-none select-none"
          />
        </div>

        {/* FORMULÁRIO */}
        <form onSubmit={handleLogin} className="space-y-5">
          
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-[10px] font-bold text-[#8c9fba] uppercase tracking-wider ml-1">E-mail</label>
            <div className="flex items-center bg-[#131c2a] border border-[#1f2b3e] rounded-xl focus-within:border-[#C5A059] focus-within:ring-1 focus-within:ring-[#C5A059] transition-all overflow-hidden relative">
              <div className="pl-4 pr-2 flex items-center text-[#64748b]">
                <Mail className="w-4 h-4" />
              </div>
              <input 
                type="email" 
                id="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent text-white text-sm py-3.5 pr-4 focus:outline-none relative z-0"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-[10px] font-bold text-[#8c9fba] uppercase tracking-wider ml-1">Senha</label>
            <div className="flex items-center bg-[#131c2a] border border-[#1f2b3e] rounded-xl focus-within:border-[#C5A059] focus-within:ring-1 focus-within:ring-[#C5A059] transition-all overflow-hidden relative">
              <div className="pl-4 pr-2 flex items-center text-[#64748b]">
                <Lock className="w-4 h-4" />
              </div>
              <input 
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                // Mantém pr-14 para o texto não ficar atrás do ícone quando ele aparecer
                className="w-full bg-transparent text-white text-sm py-3.5 pr-14 focus:outline-none relative z-0"
              />
              
              {/* 🚀 Renderização Condicional: Só aparece se houver texto digitado */}
              {password.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowPassword(!showPassword);
                  }}
                  // 👇 A LINHA RESPONSÁVEL PELA COR É ESTA AQUI:
                  // Troquei de text-[#C5A059] para text-white para brilhar no fundo escuro
                  className="absolute right-0 top-0 h-full px-4 flex items-center text-white hover:text-[#C5A059] transition-colors focus:outline-none z-10 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              )}
            </div>
          </div>

          {/* MENSAGEM DE ERRO */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
              <span className="text-xs text-red-400 font-semibold">{error}</span>
            </div>
          )}

          {/* O BOTÃO DOURADO METÁLICO */}
          <button 
            type="submit" 
            disabled={loading}
            style={{
              background: 'linear-gradient(to bottom, #e3c47d, #b89145)',
              color: '#04060a',
              borderColor: '#7a5e2a'
            }}
            className="w-full mt-8 py-4 text-xs font-extrabold uppercase tracking-widest rounded-xl flex items-center justify-center gap-3 group transition-all duration-150
              border shadow-[inset_0_2px_0_rgba(255,255,255,0.4),0_6px_15px_rgba(197,160,89,0.2)] 
              hover:shadow-[inset_0_2px_0_rgba(255,255,255,0.5),0_8px_20px_rgba(197,160,89,0.4)]
              active:translate-y-[2px] active:shadow-[inset_0_3px_8px_rgba(0,0,0,0.4)] 
              disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-[#04060a]" />
                <span>Autenticando...</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <span>Entrar na Plataforma</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            )}
          </button>

        </form>
      </div>
    </div>
  );
}