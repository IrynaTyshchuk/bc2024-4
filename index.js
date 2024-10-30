// Імпортуємо необхідні модулі
const http = require('http'); 
const { Command } = require('commander'); 
const fs = require('fs'); 
const path = require('path'); 
const superagent = require('superagent'); 
const web = new Command();

web.requiredOption('-h, --host <type>', 'Server address'); 
web.requiredOption('-p, --port <number>', 'Server port'); 
web.requiredOption('-c, --cache <path>', 'Path to cache'); 
web.parse(process.argv);
const options = web.opts();
const { host, port, cache } = options;

// Створюємо директорію кеш
if (!fs.existsSync(cache)) {
  fs.mkdirSync(cache, { recursive: true }); 
}

// Створюємо HTTP-сервер
const server = http.createServer();
server.listen(port, host, () => {
  console.log(`Server address is http://${host}:${port}`); 
});

// Функція для отримання шляху до файлу кешу за кодом
function getCacheFilePath(code) {
  return path.join(cache, `${code}.jpg`); 
}

// Обробляємо запити до сервера
server.on('request', async (req, res) => {
  const { method, url } = req; // Отримуємо метод та URL запиту
  const code = url.slice(1); 

  if (method === 'GET') { // Якщо метод GET
    try {
      const filePath = getCacheFilePath(code); // Отримуємо шлях до файлу кешу
      const data = await fs.promises.readFile(filePath); 
      console.log(`Image found in cache: ${filePath}`);
      res.writeHead(200, { 'Content-Type': 'image/jpeg' });
      res.end(data); 
    } catch (error) {
      console.error(`Image not found in cache. Attempting to load from http.cat: ${error.message}`); 
      try {
        // Завантажуємо зображення з http.cat
        const response = await superagent.get(`https://http.cat/${code}`).buffer(); 
        console.log(`Request to https://http.cat/${code} successful`); 

        if (response && response.body) { // Перевіряємо, що отримали дані
          const filePath = getCacheFilePath(code);
          await fs.promises.writeFile(filePath, response.body); // Записуємо зображення в кеш
          console.log(`Image saved to cache: ${filePath}`); 

          res.writeHead(200, { 'Content-Type': 'image/jpeg' }); 
          res.end(response.body); 
        } else {
          throw new Error('Response body is empty or invalid'); // Викидаємо помилку
        }
      } catch (fetchError) {
        console.error(`Failed to load from https://http.cat/${code}: ${fetchError.message}`); 
        res.writeHead(404, { 'Content-Type': 'text/plain' }); 
        res.end('Image not found'); 
      }
    }
  } else if (method === 'PUT') { // Якщо метод PUT
    let body = []; // Масив для зберігання отриманих даних
    req.on('data', chunk => body.push(chunk)); // Додаємо отримані дані в масив
    req.on('end', async () => { 
      try {
        const filePath = getCacheFilePath(code); // Отримуємо шлях до файлу кешу
        await fs.promises.writeFile(filePath, Buffer.concat(body)); 
        res.writeHead(201, { 'Content-Type': 'text/plain' }); 
        res.end('Image successfully saved to cache'); 
      } catch (error) {
        console.error(`Error saving image: ${error.message}`); //  помилка при збереженні
        res.writeHead(500, { 'Content-Type': 'text/plain' }); 
        res.end('Error saving image'); 
      }
    });
  } else if (method === 'DELETE') { // Якщо метод DELETE
    try {
      const filePath = getCacheFilePath(code); // Отримуємо шлях до файлу кешу
      await fs.promises.unlink(filePath); // Видаляємо файл з кешу
      res.writeHead(200, { 'Content-Type': 'text/plain' }); 
      res.end('Image successfully deleted'); 
    } catch (error) {
      console.error(`Image not found: ${error.message}`); 
      res.writeHead(404, { 'Content-Type': 'text/plain' }); 
      res.end('Image not found'); 
    }
  } else { // Якщо метод не підтримується
    res.writeHead(405, { 'Content-Type': 'text/plain' }); 
    res.end('Method not allowed'); 
  }
});
