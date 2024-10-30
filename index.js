const http = require('http');
const { Command } = require('commander');
const fs = require('fs');
const path = require('path');
const superagent = require('superagent');

const program = new Command();

program
  .requiredOption('-h, --host <host>', 'server address', 'localhost')
  .requiredOption('-p, --port <port>', 'server port', 3000)
  .requiredOption('-c, --cache <path>', 'path to cache', './cache');

program.parse(process.argv);

const { host, port, cache } = program.opts();
const fsPromises = fs.promises;

function getCacheFilePath(code) {
  return path.join(cache, `${code}.jpg`);
}

const server = http.createServer(async (req, res) => {
  const { method, url } = req;
  const httpCode = url.slice(1); // Extract the code from URL

  if (method === 'GET') {
    try {
      const filePath = getCacheFilePath(httpCode);
      const data = await fsPromises.readFile(filePath);
      console.log(`Image found in cache: ${filePath}`);
      res.writeHead(200, { 'Content-Type': 'image/jpeg' });
      res.end(data);
    } catch (error) {
      console.error(`Image not found in cache. Attempting to load from http.cat: ${error.message}`);
      try {
        const response = await superagent.get(`https://http.cat/${httpCode}`);
        
        // Переконаємося, що отримане зображення є буфером
        if (response && response.body) {
          const filePath = getCacheFilePath(httpCode);
          await fsPromises.writeFile(filePath, response.body);
          console.log(`Image saved to cache: ${filePath}`);
          
          res.writeHead(200, { 'Content-Type': 'image/jpeg' });
          res.end(response.body);
        } else {
          throw new Error('Received invalid image data');
        }
      } catch (fetchError) {
        console.error(`Failed to load image from https://http.cat/${httpCode}: ${fetchError.message}`);
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Image not found');
      }
    }
  } else if (method === 'PUT') {
    let body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', async () => {
      try {
        const filePath = getCacheFilePath(httpCode);
        await fsPromises.writeFile(filePath, Buffer.concat(body));
        console.log(`Image successfully saved to cache: ${filePath}`);
        res.writeHead(201, { 'Content-Type': 'text/plain' });
        res.end('Image saved successfully');
      } catch (error) {
        console.error(`Failed to save image: ${error.message}`);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error saving image');
      }
    });
  } else if (method === 'DELETE') {
    try {
      const filePath = getCacheFilePath(httpCode);
      await fsPromises.unlink(filePath);
      console.log(`Image successfully deleted: ${filePath}`);
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Image deleted successfully');
    } catch (error) {
      console.error(`Image not found: ${error.message}`);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Image not found');
    }
  } else {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
  }
});

server.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}/`);
});
