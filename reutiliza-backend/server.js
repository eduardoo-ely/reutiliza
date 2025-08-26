const express = require('express');
const app = express();
const PORT = 3000;

console.log('--- Iniciando script de teste do servidor ---');

// Uma rota de teste simples
app.get('/', (req, res) => {
    res.send('O servidor de teste está funcionando!');
});

// A linha mais importante: inicia o servidor e o mantém "ouvindo"
app.listen(PORT, () => {
    console.log(`>>> SERVIDOR DE TESTE RODANDO em http://localhost:${PORT}`);
    console.log('O terminal deve permanecer "travado" aqui, esperando por requisições.');
    console.log('Pressione CTRL + C para parar.');
});

console.log('--- Fim do código. O processo agora deve ficar em modo de espera. ---');