const fs = require("fs");
const { Command } = require("commander");
const http = require("http");

const program = new Command();
program
    .option("-h, --host <host>")
    .option("-p, --port <port>")
    .option("-c, --cache <path>");

program.parse(process.argv);
const { host, port, cache } = program.opts();

// Перевірка на існування директорії
if (!fs.existsSync(cache)) {
    console.error("Cache directory does not exist");
    process.exit(1);
}

// Створення сервера
const server = http.createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/plain");
    res.end("Hello world\n");
});

// Запуск сервера
server.listen(port, host, () => {
    console.log(`Server running`);
});
