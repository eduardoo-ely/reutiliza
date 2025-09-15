# ♻️ Reutiliza - Plataforma de Coleta Seletiva

## 🎯 Sobre o Projeto

O **Reutiliza** é uma aplicação web full-stack desenvolvida como projeto
acadêmico.\
Seu objetivo é **facilitar a reciclagem em Chapecó/SC**, conectando
cidadãos aos pontos de coleta (Ecopontos) da cidade.

A plataforma ajuda usuários a **localizar Ecopontos, filtrar por
materiais aceitos e calcular rotas otimizadas**, incentivando o descarte
correto e a sustentabilidade.

No futuro, o **Reutiliza** poderá ser expandido para empresas,
oferecendo relatórios de reciclagem e dashboards de monitoramento ---
possibilitando benefícios fiscais para quem comprovar a destinação
correta de resíduos.

------------------------------------------------------------------------

## ✨ Funcionalidades

-   **🌍 Frontend Interativo**
    -   Mapa dinâmico com **Leaflet**, exibindo Ecopontos com ícones e
        popups informativos.
    -   **Geolocalização** do usuário para encontrar os pontos mais
        próximos.
    -   **Rotas otimizadas** até o Ecoponto que recebe o material
        selecionado.
    -   Design responsivo e moderno (desktop e mobile).
-   **⚙️ Backend Robusto**
    -   API **RESTful** com Node.js + Express.
    -   Banco de dados **MongoDB Atlas** (nuvem).
    -   Modelagem normalizada (3FN) para integridade e consistência dos
        dados.
-   **🔑 Autenticação**
    -   Login de usuários com segurança e persistência de sessão.
-   **📊 Futuro**
    -   Dashboard para empresas monitorarem quantidade de resíduos
        reciclados.
    -   Relatórios automáticos para **isenção fiscal**.
    -   Gamificação: pontos e recompensas para cidadãos que reciclam.

------------------------------------------------------------------------

## 🛠️ Tecnologias

  Área                 Tecnologias
  -------------------- ------------------------------------------
  **Frontend**         Angular 17+, TypeScript, CSS3
  **Backend**          Node.js, Express.js
  **Banco de Dados**   MongoDB, Mongoose, MongoDB Atlas (Cloud)
  **Mapa**             Leaflet, Leaflet Routing Machine

------------------------------------------------------------------------

## 🚀 Como Executar

### Pré-requisitos

-   [Node.js](https://nodejs.org/) v18+\
-   [Angular CLI](https://angular.dev/tools/cli)
    (`npm install -g @angular/cli`)\
-   Conta no [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)

------------------------------------------------------------------------

### 1. Clonar o Repositório

``` bash
git clone https://github.com/eduardoo-ely/reutiliza.git
cd reutiliza
```

------------------------------------------------------------------------

### 2. Configurar e Rodar o Backend

``` bash
cd reutiliza-backend
npm install
```

-   Abra `server.js` e configure sua `MONGO_URI` com a string do MongoDB
    Atlas.

*(Opcional)* Popule o banco:

``` bash
node seed.js
```

-   Inicie o servidor:\

``` bash
node server.js
```

Servidor em: <http://localhost:3000>

------------------------------------------------------------------------

### 3. Rodar o Frontend

``` bash
cd reutiliza
npm install
ng serve
```

Frontend em: <http://localhost:4200>

------------------------------------------------------------------------

## 👨‍💻 Autores

-   **Eduardo Ely** -- Desenvolvimento Full-stack\
-   Projeto acadêmico de **Ciência da Computação - Unochapecó**

------------------------------------------------------------------------

## 📄 Licença

Este projeto é de uso **acadêmico**. Futuramente poderá ser licenciado
sob MIT ou outra licença open-source.
