import { parentPort, workerData } from 'worker_threads';
import fs from 'fs';
import path from 'path';

const { threadId, ids, modo } = workerData;

const LOG_FILE = modo === 'real'
    ? path.join(__dirname, '..', 'etl', 'lista_ids.txt')  // marca se existir no banco
    : path.join(__dirname, '..', 'etl', 'logs.txt');      // logs fake

async function processarItem(id: number) {
    if (modo === 'real') {
        return {
            id,
            status: 'ok',
            tipo: 'ponto_coleta',
            mensagem: 'coleta registrada'
        };
    } else {
        return {
            id,
            status: 'ok',
            valor: (Math.random() * 999).toFixed(2),
            nome: `mock_${id}`
        };
    }
}

async function processar() {
    const registros = modo === 'fake'
        ? Array.from({ length: 200 }, (_, i) => i + 1 + (threadId - 1) * 200)
        : ids || [];

    if (registros.length === 0) {
        console.log(`[Thread ${threadId}] Nenhum ID para processar.`);
        parentPort?.close();
        return;
    }

    for (const item of registros) {
        const resposta = await processarItem(Number(item));
        const data = new Date().toLocaleString('pt-BR');
        const linha = `Thread ${threadId}, ID ${resposta.id}, Resposta ${JSON.stringify(resposta)}, Data ${data}\n`;

        fs.appendFileSync(LOG_FILE, linha);
    }

    console.log(`[Thread ${threadId}] Finalizou processamento (${modo}).`);
    parentPort?.postMessage(`Thread ${threadId} completou ${registros.length} registros.`);
    parentPort?.close();
}

processar();
