import { createServer, Server as HTTPServer } from 'http';
import app from './app';
import seedSuperAdmin from './app/DB';
import { initSocket } from './app/utils/socket';
import config from './config';
import { customConsole } from './app/utils/customConsole';
import { redis } from './app/redis/redis';

const port = config.port || 5000;

async function main() {
  await redis.connect();
  const server: HTTPServer = createServer(app).listen(port, () => {
    customConsole(port, 'Kahf Collective (Server)');
    seedSuperAdmin();
  });

  const io = initSocket(server);

  io.on('connection', socket => {
    console.log('User connected:', socket.id);
    socket.on('register', (userId: string) => {
      socket.join(userId);
      console.log(`User ${userId} joined their personal room`);
    });
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  const exitHandler = () => {
    if (server) {
      server.close(() => {
        console.info('Server closed!');
      });
    }
    process.exit(1);
  };

  process.on('uncaughtException', error => {
    console.log(error);
    exitHandler();
  });

  process.on('unhandledRejection', error => {
    console.log(error);
    exitHandler();
  });
}

main();
