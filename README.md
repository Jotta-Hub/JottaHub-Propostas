# JOTTA HUB — Sistema de Propostas

## Setup

### 1. Instalar dependências
```bash
npm install
```

### 2. Variáveis de ambiente
Crie `.env.local` com:
```
NEXT_PUBLIC_SUPABASE_URL=https://nhtbiczetahczkihofsi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
```

### 3. Supabase Storage (para logos)
No painel do Supabase:
- Vá em **Storage** → **New bucket**
- Nome: `proposal-assets`
- Marque **Public bucket**
- Em **Policies**, adicione policy: `allow all` para anon

### 4. Rodar localmente
```bash
npm run dev
```
Acesse: http://localhost:3000

### 5. Deploy no Vercel
```bash
# 1. Suba pro GitHub
git init
git add .
git commit -m "init"
git remote add origin https://github.com/SEU_USER/jottahub-propostas.git
git push -u origin main

# 2. No Vercel:
# - Import o repositório
# - Adicione as env vars (NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY)
# - Deploy!
```

### 6. Domínio personalizado
No Vercel → Settings → Domains → adicione seu domínio da KingHost.
Na KingHost, adicione um CNAME apontando para `cname.vercel-dns.com`.

## Rotas
- `/admin` — painel de gerenciamento
- `/proposta/[id]` — proposta pública do cliente
