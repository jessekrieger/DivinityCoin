const express = require('express');
const http = require('http');
const endpoints = require('./endpoints');

class HTTPServer {
  constructor({ port = 12345 }) {
    this.port = port;
  }

  init() {
    this.app = express();
    this.app.use('/', endpoints);
  }

  start() {
    return new Promise(async (resolve, reject) => {
      this.server = http.createServer(this.app);
      this.server.listen(this.port, '0.0.0.0', (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(`HTTP  started http://localhost:${this.port}/`);
      });
    });
  }
}

module.exports = HTTPServer;
