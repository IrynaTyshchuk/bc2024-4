const http = require('http');
const { Command } = require('commander');
const fs = require('fs');
const path = require('path');

const web = new Command();
web.requiredOption('-h, --host <type>', 'Адреса сервера')
web.requiredOption('-p, --port <number>', 'Порт сервера')
web.requiredOption('-c, --cache <path>', 'Шлях до кешу');

web.parse(process.argv);

const options = web.opts();
const { host, port, cache } = options;

const server = http.createServer();

server.listen(port, host, () => {
  console.log(`Server adress is http://${host}:${port}`);
});



const fsPromises = fs.promises;
const superagent = require('superagent');

function getCacheFilePath(code) {
  return path.join(cache, `${code}.jpg`);
}


server.on('request', async (req, res) => {
    const { method, url } = req;
    const code = url.slice(1);
  
    if (method === 'GET') {
      try {
        const filePath = getCacheFilePath(code);
        const data = await fsPromises.readFile(filePath);
        console.log(`Картинка знайдена в кеші: ${filePath}`);
        res.writeHead(200, { 'Content-Type': 'image/jpeg' });
        res.end(data);
      } catch (error) {
        console.error(`Картинку не знайдено в кеші. Спроба завантажити з http.cat: ${error.message}`);
        try {
          const response = await superagent.get(`https://http.cat/${code}`);
          console.log(`Запит до https://http.cat/${code} успішний`);
          
          const filePath = getCacheFilePath(code);
          await fsPromises.writeFile(filePath, response.body);
          console.log(`Картинка збережена в кеші: ${filePath}`);
  
          res.writeHead(200, { 'Content-Type': 'image/jpeg' });
          res.end(response.body);
        } catch (fetchError) {
          console.error(`Помилка завантаження з https://http.cat/${code}: ${fetchError.message}`);
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Картинку не знайдено');
        }
      }
  } else if (method === 'PUT') {
    let body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', async () => {
      try {
        const filePath = getCacheFilePath(code);
        await fsPromises.writeFile(filePath, Buffer.concat(body));
        res.writeHead(201, { 'Content-Type': 'text/plain' });
        res.end('Картинка успішно збережена в кеші');
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Помилка збереження картинки');
      }
    });
  } else if (method === 'DELETE') {
    try {
      const filePath = getCacheFilePath(code);
      await fsPromises.unlink(filePath);
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Картинка успішно видалена');
    } catch (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Картинку не знайдено');
    }
  } else {

    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Метод не дозволений');
  }
});