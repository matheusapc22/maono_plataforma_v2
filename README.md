# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## Documentação (PT-BR) — Backend com Cloudflare D1 + Projetos do usuário

Esta seção explica como subir o backend, configurar variáveis de ambiente e usar a nova aba **“My Projects”** para abrir projetos Kepler (JSON) dentro da interface.

### 1) Pré-requisitos

- Node.js 18+ (recomendado).
- Dependências do frontend instaladas.
- Dependências do backend instaladas.

### 2) Instalando dependências

No frontend:

```bash
npm install
```

No backend:

```bash
cd server
npm install
```

### 3) Configurar Cloudflare D1 e variáveis de ambiente

Crie o banco D1 e vincule ao projeto com o `wrangler`:

```bash
cd server
npx wrangler d1 create maono-db
```

Copie o `database_id` retornado e atualize o arquivo `server/wrangler.toml`.

Em seguida, execute o schema:

```bash
npx wrangler d1 execute maono-db --file=server/schema.sql
```

Você pode configurar via variáveis de ambiente (opcionais):

- `JWT_SECRET` (**obrigatório em produção**)
- `JWT_EXPIRES_IN` (padrão: `8h`)
- `CORS_ORIGIN` (padrão: `*`)

Exemplo:

```bash
export JWT_SECRET="minha_chave_super_secreta"
export JWT_EXPIRES_IN="8h"
export CORS_ORIGIN="http://localhost:5173"
```

### 4) Iniciando o backend (Cloudflare Workers)

```bash
cd server
npm run dev
```

Você verá algo como:

```
Backend iniciado pelo Wrangler (URL exibida no terminal)
```

### 5) Configurando o frontend para apontar para o backend

Crie um arquivo `.env` na raiz do projeto (mesmo nível de `package.json`):

```
VITE_API_URL=http://localhost:4000
```

Depois, inicie o frontend:

```bash
npm run dev
```

### 6) Fluxo de uso no front (My Projects)

1. Abra o app no navegador.
2. Clique em **Add Data**.
3. Selecione a aba **My Projects**.
4. Faça **Cadastro** ou **Login**.
5. Após autenticar, a lista de projetos aparece.
6. (Opcional) Use o **Filtro por cidade** para aplicar um recorte no JSON.
7. Clique em **Abrir** para carregar o JSON no Kepler.

### 7) Endpoints disponíveis

Base URL: `http://localhost:4000`

- `POST /auth/signup`  
  **Body:** `{ "email": "...", "password": "..." }`
- `POST /auth/login`  
  **Body:** `{ "email": "...", "password": "..." }`
- `GET /projects`  
  **Header:** `Authorization: Bearer <token>`
- `GET /projects/:id`  
  **Header:** `Authorization: Bearer <token>`  
  **Query (opcional):** `?city=São Paulo&field=cidade`
- `POST /projects`  
  **Header:** `Authorization: Bearer <token>`  
  **Body:** `{ "name": "...", "keplerJson": { ... } }`
- `PUT /projects/:id`  
  **Header:** `Authorization: Bearer <token>`  
  **Body:** `{ "name": "...", "keplerJson": { ... } }`
- `DELETE /projects/:id`  
  **Header:** `Authorization: Bearer <token>`

### 8) Observações importantes

- O banco fica no **Cloudflare D1** (não há arquivo SQLite local).
- Em **produção**, configure `JWT_SECRET` para evitar o erro de segurança.
- Se o frontend estiver em domínio diferente do backend, ajuste `CORS_ORIGIN`.
- O filtro por cidade usa o mapa Leaflet com tiles do OpenStreetMap.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
