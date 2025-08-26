# ♻️ Reutiliza App

## 🎯 Sobre o Projeto

O **Reutiliza** é uma aplicação web interativa desenvolvida como a implementação prática do projeto acadêmico "ABEX-II". O objetivo principal é ajudar os usuários a encontrarem os pontos de coleta de materiais recicláveis mais próximos de sua localização atual, incentivando a prática da reciclagem e o descarte correto de resíduos na cidade de Chapecó - SC.

O usuário pode visualizar todos os pontos de coleta no mapa, filtrar por tipo de material (plástico, vidro, etc.) e traçar uma rota otimizada do seu local até o destino.

---

## ✨ Funcionalidades Implementadas

* **Autenticação de Usuários:** Sistema completo de Login e Cadastro de contas.
* **Mapa Interativo (Leaflet):**
    * **Geolocalização:** O mapa centraliza automaticamente na localização atual do usuário.
    * **Visualização de Pontos:** Exibe todos os pontos de coleta cadastrados com ícones personalizados.
    * **CRUD no Mapa:** Permite criar, editar e excluir pontos de coleta diretamente clicando no mapa.
* **Sistema de Roteamento:**
    * **Filtro por Material:** Botões de acesso rápido para filtrar por tipo de material.
    * **Rota até o Ponto Mais Próximo:** Calcula e desenha a rota otimizada da localização do usuário até o ponto de coleta mais próximo que aceita o material selecionado.
* **Persistência de Dados:** Todas as informações de usuários e pontos de coleta são salvas localmente no navegador usando `localStorage`.

---

## 🛠️ Tecnologias Utilizadas

* **Frontend:** [Angular](https://angular.io/) v17+
* **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
* **Mapa:** [Leaflet](https://leafletjs.com/)
* **Roteamento no Mapa:** [Leaflet Routing Machine](http://www.liedman.net/leaflet-routing-machine/)
* **Estilização:** CSS3 puro e responsivo

---

## 🚀 Como Executar o Projeto

Para executar o projeto em sua máquina local, siga os passos abaixo:

1.  **Clone o repositório:**
    ```bash
    git clone [https://github.com/eduardo0ely/reutiliza.git](https://github.com/eduardo0ely/reutiliza.git)
    ```

2.  **Acesse a pasta do projeto:**
    ```bash
    cd reutiliza
    ```

3.  **Instale as dependências:**
    (É necessário ter o [Node.js](https://nodejs.org/) instalado)
    ```bash
    npm install
    ```

4.  **Execute a aplicação:**
    ```bash
    ng serve
    ```

5.  **Acesse no navegador:**
    Abra seu navegador e acesse `http://localhost:4200/`.

---

## STATUS DO PROJETO

🚧 **Em desenvolvimento...** 🚧

Este projeto foi desenvolvido como parte de um trabalho acadêmico e está em constante evolução.

---

## 📄 Licença

Este projeto está sob a licença.
