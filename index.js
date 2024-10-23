const http = require ('http');
const { Command } = require('commander');
const fs = require ('fs');

const program = new Command();

program
.option('-h, --host <host>', 'server address')
.option('-p, --port <port>', 'server port')
.option('-c, --cache <path>', 'path to cache');
program.parse(process.argv);
const { host,port,cache} = program.opts();
if (!fs.existsSync(cache)){
    console.error('cache directory doesn`t exist');
    process.exit(1);
}

const server = http.createServer((req,res) =>{
    res.statusCode = 200;
});
server.listen(port, host, () => {
    console.log('Server running');
});