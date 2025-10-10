import { Worker } from 'worker_threads';
import fs from 'fs';
import path from 'path';

const ETL_DIR = path.join(__dirname, '..', 'etl');
const LOG_FILE = path.join(ETL_DIR, 'logs.txt');
const IDS_FILE = path.join(ETL_DIR, 'lista_ids.txt');

const modo = process.argv.find(arg => arg.includes('--modo='))?.split('=')[1] || 'fake';

// limpa o log no modo fake (TPE)
if (modo === 'fake' && fs.existsSync(LOG_FILE)) fs.unlinkSync(LOG_FILE);

let todosIds: string[] = [];
if (modo === 'real') {
    if (fs.existsSync(IDS_FILE)) {
        todosIds = fs.readFileSync(IDS_FILE, 'utf-8').trim().split('\n');
    }
}

const NUM_THREADS = 5;
const workers: Worker[] = [];

console.log('[P1] Iniciando threads...');

for (let i = 0; i < NUM_THREADS; i++) {
    let idsChunk: string[] = [];

    if (modo === 'real') {
        const chunkSize = Math.ceil(todosIds.length / NUM_THREADS);
        const start = i * chunkSize;
        const end = (i + 1) * chunkSize;
        idsChunk = todosIds.slice(start, end);
    }

    const worker = new Worker(path.join(__dirname, 'worker.js'), {
        workerData: { threadId: i + 1, ids: idsChunk, modo }
    });

    worker.on('message', msg => console.log(`[Thread ${i + 1}] ${msg}`));
    worker.on('error', err => console.error(`[Thread ${i + 1}] ERRO:`, err));

    workers.push(worker);
}

let finalizados = 0;
workers.forEach(worker => {
    worker.on('exit', () => {
        finalizados++;
        if (finalizados === workers.length) {
            console.log('[P1] Todas as threads terminaram. Processo concluído.');
            process.exit(0);
        }
    });
});
