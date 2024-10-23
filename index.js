const http = require('http'); 
const { Command } = require('commander'); 
const fs = require('fs/promises'); 
const path = require('path'); 
const superagent = require('superagent'); 

const program = new Command(); 

program
  .option('-h, --host <host>', 'server address', 'localhost')
  .option('-p, --port <port>', 'server port', 3000) 
  .option('-c, --cache <path>', 'path to cache', './cache'); 

program.parse(process.argv); // Аналізуємо аргументи командного рядка.

const { host, port, cache } = program.opts(); 

const server = http.createServer(async (req, res) => { // Створюємо HTTP-сервер.
  const urlParts = req.url.split('/'); 
  const httpCode = urlParts[1]; // Отримуємо код HTTP з URL
  const filePath = path.join(cache, `${httpCode}.jpg`); // Формуємо шлях до файлу

  switch (req.method) { 
    case 'GET': // Якщо метод запиту - GET.
    try {
      const data = await fs.readFile(filePath); // Спробуємо прочитати файл 
      res.writeHead(200, { 'Content-Type': 'image/jpeg' }); 
      res.end(data); // Відправляємо дані зображення
    } catch (err) {
      if (err.code === 'ENOENT') { // Якщо файл не знайдено в кеші
        try {
          // Запит до http.cat за картинкою
          const response = await superagent.get(`https://http.cat/${httpCode}`);
          if (response.status === 200) { // Перевіряємо статус відповіді
            const imageBuffer = response.body; // Отримуємо зображення
  
            // Зберігаємо картинку у кеш
            await fs.writeFile(filePath, imageBuffer);
            
            res.writeHead(200, { 'Content-Type': 'image/jpeg' });
            res.end(imageBuffer);
          } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' }); // Якщо статус не 200
            res.end('Not Found'); 
          }
        } catch (error) {
          // У випадку, якщо запит до http.cat завершився помилкою
          res.writeHead(404, { 'Content-Type': 'text/plain' }); // Якщо сталася помилка
          res.end('Not Found');
        }
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' }); 
        res.end('Internal Server Error'); 
      }
    }
  

    case 'PUT': // Якщо метод запиту - PUT.
      const chunks = []; // Масив для збору даних.
      req.on('data', chunk => chunks.push(chunk)); // Додаємо дані у масив 
      req.on('end', async () => { 
        const imageBuffer = Buffer.concat(chunks); // Об'єднуємо дані у буфер.
        await fs.writeFile(filePath, imageBuffer); // Записуємо буфер у файл 
        res.writeHead(201, { 'Content-Type': 'text/plain' }); 
        res.end('Created'); 
      });
      break;

    case 'DELETE': // Якщо метод запиту - DELETE.
      try {
        await fs.unlink(filePath); // Спробуємо видалити файл 
        res.writeHead(200, { 'Content-Type': 'text/plain' }); 
        res.end('Deleted'); 
      } catch (err) {
        if (err.code === 'ENOENT') { // Якщо файл не знайдено.
          res.writeHead(404, { 'Content-Type': 'text/plain' }); 
          res.end('Not Found'); 
        } else {
          res.writeHead(500, { 'Content-Type': 'text/plain' }); 
          res.end('Internal Server Error'); 
        }
      }
      break;

    default: 
      res.writeHead(405, { 'Content-Type': 'text/plain' }); 
      res.end('Method Not Allowed'); 
  }
});

server.listen(port, host, () => { // Запускаємо сервер 
  console.log(`Server running at http://${host}:${port}/`); 
}); 
