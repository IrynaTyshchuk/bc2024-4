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

// Create the cache directory if it doesn't exist
if (!fs.existsSync(cache)) {
  fs.mkdirSync(cache, { recursive: true });
}

const server = http.createServer();

server.listen(port, host, () => {
  console.log(`Server address is http://${host}:${port}`);
});

function getCacheFilePath(code) {
  return path.join(cache, `${code}.jpg`);
}

server.on('request', async (req, res) => {
  const { method, url } = req;
  const code = url.slice(1);

  if (method === 'GET') {
    try {
      const filePath = getCacheFilePath(code);
      const data = await fs.promises.readFile(filePath);
      console.log(`Image found in cache: ${filePath}`);
      res.writeHead(200, { 'Content-Type': 'image/jpeg' });
      res.end(data);
    } catch (error) {
      console.error(`Image not found in cache. Attempting to load from http.cat: ${error.message}`);
      try {
        const response = await superagent.get(`https://http.cat/${code}`);
        console.log(`Request to https://http.cat/${code} successful`);

        // Ensure we are dealing with a buffer
        if (response && response.body) {
          const filePath = getCacheFilePath(code);
          await fs.promises.writeFile(filePath, response.body);
          console.log(`Image saved to cache: ${filePath}`);

          res.writeHead(200, { 'Content-Type': 'image/jpeg' });
          res.end(response.body);
        } else {
          throw new Error('Response body is empty or invalid');
        }
      } catch (fetchError) {
        console.error(`Failed to load from https://http.cat/${code}: ${fetchError.message}`);
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Image not found');
      }
    }
  } else if (method === 'PUT') {
    let body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', async () => {
      try {
        const filePath = getCacheFilePath(code);
        await fs.promises.writeFile(filePath, Buffer.concat(body));
        res.writeHead(201, { 'Content-Type': 'text/plain' });
        res.end('Image successfully saved to cache');
      } catch (error) {
        console.error(`Error saving image: ${error.message}`);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error saving image');
      }
    });
  } else if (method === 'DELETE') {
    try {
      const filePath = getCacheFilePath(code);
      await fs.promises.unlink(filePath);
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Image successfully deleted');
    } catch (error) {
      console.error(`Image not found: ${error.message}`);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Image not found');
    }
  } else {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method not allowed');
  }
});
