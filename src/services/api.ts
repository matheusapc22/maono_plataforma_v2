// src/services/api.ts

// Quando formos para produção, trocaremos por: https://api.maono.com.br
const API_URL = "http://localhost:4000";

export const maonoApi = {
  // ==========================================
  // 🗄️ CATÁLOGO DE DADOS
  // ==========================================
  getCatalog: async () => {
    const response = await fetch(`${API_URL}/catalog`);
    if (!response.ok) throw new Error("Erro ao carregar o catálogo");
    return response.json();
  },

  // ==========================================
  // 🔐 AUTENTICAÇÃO
  // ==========================================
  login: async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Erro ao fazer login");
    }
    
    return response.json(); // Retorna o { token }
  },

  getMe: async (token: string) => {
    const response = await fetch(`${API_URL}/auth/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
    });
    
    if (!response.ok) throw new Error("Sessão inválida ou expirada");
    return response.json();
  }
};