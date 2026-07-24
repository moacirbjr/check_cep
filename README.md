# 📍 Consulta e Descoberta de CEP — ViaCEP API

Uma aplicação web moderna, responsiva e de **arquivo único (*standalone*)** para consulta de endereços por CEP e busca reversa de CEPs por endereço utilizando a API pública e oficial do [ViaCEP](https://viacep.com.br/).

---

## ✨ Funcionalidades

- 🔍 **Busca por CEP**:
  - Formatação automática durante a digitação (`00000-000`).
  - Busca automática assim que o CEP de 8 dígitos é preenchido.
  - Exibe Logradouro, Bairro, Cidade, Estado (UF), Região, Código IBGE e DDD.

- 📍 **Descobrir CEP por Endereço (Busca Reversa)**:
  - Permite localizar o CEP informando o **Estado (UF)**, **Cidade** e **Logradouro/Rua**.
  - Exibe uma lista interativa quando múltiplos CEPs correspondem ao endereço pesquisado.

- 🗺️ **Visualização no Mapa**:
  - Exibe o mapa embutido do endereço (Google Maps) e botão direto para navegação.

- 📋 **Cópia Rápida de Endereço**:
  - Botão com suporte universal de cópia para a área de transferência (compatível com protocolo `file://` local e HTTPS).

- 📜 **Histórico de Consultas Recentes**:
  - Armazena automaticamente as últimas pesquisas no `localStorage` do navegador para acesso com 1 clique.

- 🎨 **Design Glassmorphic & Dark Mode**:
  - Interface visual com estética *Glassmorphism*, efeitos de iluminação (*glow*), animações fluidas e leitor de carregamento (*skeleton screen*).

- ⚡ **Zero Dependências & Arquivo Único**:
  - Todo o código (HTML, CSS e JavaScript) está contido no arquivo `cepseach.html`. Funciona offline/localmente sem precisar de npm, Node.js ou instalação de servidor.

---

## 🚀 Como Utilizar

### Opção 1: Execução Direta (Sem Servidor)
1. Baixe ou acesse este diretório.
2. Dê dois cliques no arquivo [`cepseach.html`](cepseach.html) para abri-lo diretamente em qualquer navegador moderno.

### Opção 2: Servidor Local (Opcional)
Se preferir rodar com um servidor HTTP local:

```bash
# Utilizando npx serve
npx -y serve .

# Ou com Python 3
python -m http.server 8080
```
Em seguida, acesse no navegador: `http://localhost:8080/cepseach.html` (ou a porta indicada).

---

## 🛠️ Tecnologias Utilizadas

- **HTML5**: Estrutura semântica e acessível.
- **CSS3 Vanilla**: Estilização personalizada com Variáveis CSS, Flexbox, CSS Grid, Glassmorphism e animações.
- **JavaScript (ES6+)**: Consumo de APIs assíncronas (`fetch` / `async-await`), manipulação do DOM e `localStorage`.
- **Google Fonts**: Tipografia *Plus Jakarta Sans*.
- **API ViaCEP**: Serviço gratuito de busca de CEP e endereços do Brasil.

---

## 📡 Endpoints da API Utilizados

1. **Busca por CEP**:
   ```http
   GET https://viacep.com.br/ws/{cep}/json/
   ```

2. **Busca por Endereço (UF, Cidade, Rua)**:
   ```http
   GET https://viacep.com.br/ws/{uf}/{cidade}/{logradouro}/json/
   ```

---

## 📄 Licença

Este projeto é de código aberto e está disponível para uso livre. A API do ViaCEP é mantida de forma gratuita pelo serviço oficial.
