# ♻️ Reutiliza - Plataforma de Coleta Seletiva

## 🎯 Sobre o Projeto

O **Reutiliza** é uma aplicação web full-stack desenvolvida como projeto acadêmico. O objetivo é fornecer uma solução interativa e funcional para que os cidadãos de Chapecó, SC, possam localizar facilmente os Ecopontos da cidade, incentivando a reciclagem e o descarte correto de resíduos.

A plataforma exibe os pontos de coleta em um mapa, permite filtrar por tipo de material e traça rotas otimizadas, conectando o usuário ao ponto de coleta mais próximo.

---

## ✨ Funcionalidades Implementadas

-   **Frontend Interativo:**
    -   **Mapa Dinâmico (Leaflet):** Exibe todos os Ecopontos com ícones personalizados e informações detalhadas.
    -   **Geolocalização:** Centraliza o mapa na localização atual do usuário para uma experiência personalizada.
    -   **Sistema de Roteamento:** Calcula e desenha a rota do usuário até o ponto de coleta mais próximo que aceita o material selecionado.
    -   **Design Responsivo e Moderno:** Interface limpa e agradável, construída para ser fácil de usar.

-   **Backend Robusto:**
    -   **API RESTful:** Um servidor Node.js com Express gerencia todas as requisições de dados.
    -   **Banco de Dados na Nuvem:** Os dados são persistidos em um cluster MongoDB Atlas, garantindo escalabilidade e segurança.
    -   **Estrutura Normalizada:** O banco de dados segue as 3 Formas Normais para garantir a integridade e consistência dos dados.

-   **Autenticação de Usuários:** Sistema de login seguro para acesso à plataforma.

---

## 🛠️ Tecnologias Utilizadas

| Área             | Tecnologia                               |
| ---------------- | ---------------------------------------- |
| **Frontend** | Angular 17+, TypeScript, CSS3            |
| **Backend** | Node.js, Express.js                      |
| **Banco de Dados** | MongoDB, Mongoose, MongoDB Atlas (Cloud) |
| **Mapa** | Leaflet, Leaflet Routing Machine         |

---

## 🚀 Como Executar o Projeto

Para executar a aplicação completa em sua máquina local, siga os passos abaixo.

### Pré-requisitos

-   [Node.js](https://nodejs.org/) (versão 18 ou superior)
-   Uma conta no [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) para o banco de dados na nuvem.
-   Angular CLI: `npm install -g @angular/cli`

### 1. Clonar o Repositório

```bash
git clone [https://github.com/eduardoo-ely/reutiliza.git](https://github.com/eduardoo-ely/reutiliza.git)
cd reutiliza
```

### 2. Configurar e Rodar o Backend

1.  **Navegue até a pasta do backend:**
    ```bash
    cd reutiliza-backend
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```

3.  **Configure a Conexão com o Banco:**
    -   Abra o arquivo `server.js`.
    -   Na constante `MONGO_URI`, substitua a string de exemplo pela sua própria string de conexão do MongoDB Atlas.

4.  **(Opcional) Popule o banco de dados com dados iniciais:**
    ```bash
    node seed.js
    ```

5.  **Inicie o servidor backend:**
    ```bash
    node server.js
    ```
    O servidor estará rodando em `http://localhost:3000`.

### 3. Rodar o Frontend

1.  **Abra um novo terminal** na pasta raiz do projeto (`reutiliza`).

2.  **Instale as dependências:**
    ```bash
    npm install
    ```

3.  **Inicie a aplicação Angular:**
    ```bash
    ng serve
    ```
    A aplicação estará disponível em `http://localhost:4200`.

---