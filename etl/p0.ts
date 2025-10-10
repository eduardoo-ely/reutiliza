import { fork } from 'child_process';
import fs from 'fs';
import path from 'path';

const LOG_FILE = path.join(__dirname, 'logs.txt');
const p1Path = path.join(__dirname, 'p1.js');

console.log('[P0] Iniciando P1...');
const p1 = fork(p1Path);

p1.on('exit', () => {
    console.log('[P0] P1 finalizado. Validando resultado...');

    if (fs.existsSync(LOG_FILE)) {
        const lines = fs.readFileSync(LOG_FILE, 'utf-8').trim().split('\n');
        console.log(`[P0] Linhas no log: ${lines.length}`);
        console.log('[P0] ETL finalizado com sucesso. Mostrando algumas linhas:');
        console.log(lines.slice(0, 10).join('\n'));
    } else {
        console.log('[P0] Nenhum log gerado.');
    }
});
