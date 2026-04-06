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
  },

  // ==========================================
  // 🏢 GESTÃO DE ORGANIZAÇÕES / CLIENTES (SÓ PARA CEO)
  // ==========================================
  getOrganizations: async (token: string) => {
    const response = await fetch(`${API_URL}/organizations`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Erro ao carregar organizações");
    return response.json();
  },

  createOrganization: async (token: string, data: { name: string; max_users: number }) => {
    const response = await fetch(`${API_URL}/organizations`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${token}` 
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Erro ao criar empresa");
    }
    return response.json();
  },

  updateOrganizationStatus: async (token: string, orgId: string, status: string) => {
    const response = await fetch(`${API_URL}/organizations/${orgId}/status`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${token}` 
      },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Erro ao atualizar status da empresa");
    }
    return response.json();
  },

  // ==========================================
  // 👥 GESTÃO DE USUÁRIOS (MASTER E CEO)
  // ==========================================
  getUsers: async (token: string) => {
    const response = await fetch(`${API_URL}/users`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Erro ao carregar usuários");
    return response.json();
  },

  createUser: async (token: string, data: any) => {
    const response = await fetch(`${API_URL}/users`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${token}` 
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Erro ao criar usuário");
    }
    return response.json();
  },

  deleteUser: async (token: string, userId: string) => {
    const response = await fetch(`${API_URL}/users/${userId}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Erro ao deletar usuário");
    return response.json();
  }
};