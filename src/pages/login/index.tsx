// src/pages/Login/index.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router";
import { maonoApi } from "../../services/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Chama a nossa API (que bate lá no Cloudflare D1)
      const response = await maonoApi.login(email, password);
      
      // 2. Se a API devolver o Token, salvamos no cofre do navegador
      if (response.token) {
        localStorage.setItem("@maono:token", response.token);
        // 3. Redireciona o usuário para o mapa principal
        navigate("/"); 
      }
    } catch (err: any) {
      setError(err.message || "Credenciais inválidas. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#030508] px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 p-10 bg-[#0a0f18] rounded-2xl border border-[#1f2b3e] shadow-[0_25px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(197,160,89,0.05)]">
        
        {/* Cabeçalho / Logo */}
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-white tracking-[0.2em]">
            MAÕNO
          </h2>
          <p className="mt-2 text-sm text-[#8c9fba]">
            Inteligência Geográfica Premium
          </p>
        </div>

        {/* Formulário */}
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#8c9fba]">
                E-mail
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-4 py-3 bg-[#0a111f] border border-[#1f2b3e] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#C5A059] focus:border-transparent transition-all"
                placeholder="admin@maono.com.br"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8c9fba]">
                Senha
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-4 py-3 bg-[#0a111f] border border-[#1f2b3e] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#C5A059] focus:border-transparent transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* Mensagem de Erro (se houver) */}
          {error && (
            <div className="text-red-400 text-sm font-medium text-center bg-red-400/10 py-2 rounded">
              {error}
            </div>
          )}

          {/* Botão de Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-[#0a0f18] bg-gradient-to-r from-[#C5A059] to-[#8a6d3b] hover:from-[#e8c478] hover:to-[#C5A059] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0a0f18] focus:ring-[#C5A059] transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
          >
            {loading ? "Autenticando..." : "Entrar na Plataforma"}
          </button>
        </form>
      </div>
    </div>
  );
}