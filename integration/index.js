const HTTPServer = require('./server');

const start = async () => {
  const server = new HTTPServer({ port: 22345 });
  server.init();
  try {
    const message = await server.start();
    console.log(message);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};

start();
