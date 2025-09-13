import { createServer, Server as HTTPServer } from 'http';
import app from './app';
import seedSuperAdmin from './app/DB';
import { initSocket } from './app/utils/socket';
import config from './config';
const port = config.port || 5000;

async function main() {
  const server: HTTPServer = createServer(app).listen(port, () => {
    const projectName = '🎯 ' + (process.env.PROJECT_NAME ?? '');

    // Main log
    console.log(
      '\n\x1b[31m%s\x1b[0m is running on \x1b[33m%s\x1b[0m\n',
      projectName,
      port,
    );

    // Development URL log
    if (process.env.NODE_ENV === 'development')
      console.log(
        '\x1b[32m%s\x1b[0m \x1b[36m%s\x1b[0m\n',
        `${projectName} server url:`,
        `http://localhost:${port}`,
      );
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
