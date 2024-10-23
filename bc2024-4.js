const http = require ("http");
const {Commander, Command}= require("commander");
const fs = require("fs")

const program = new Command();
program
.option("-h,--host <host>")
.option("-p,--port <port>")
.option("-c,--cache <path>")
program.parse(process.argv);
const {host, port, cache}= program.opts();

//перевірка на існування файлу
if (!fs.existsSync(cache)){
    console.error("Cache directory does not exist");
    process.exit(1);
}
//cтворення серверу
const server = http.createServer((req,res )=>{
    res.statusCode=200;

}
);
//запуск сервера
server.listen(port,host, ()=>{
    console.log("Server running")
}
);