import chalk from 'chalk';

export const customConsole = (port: string | number, name: string): void => {
  const timestamp = new Date().toLocaleTimeString();
  const divider = chalk.gray('━'.repeat(60));

  console.log('\n' + divider);
  console.log(
    chalk.cyan('  ╭─────────────────────────────────────────────────────╮')
  );
  console.log(
    chalk.cyan('  │') +
    chalk.bgCyan.black.bold(`  🌟 ${name} APPLICATION SERVER  🌟   `) +
    chalk.cyan('│')
  );
  console.log(
    chalk.cyan('  ╰─────────────────────────────────────────────────────╯')
  );

  console.log('');
  console.log(
    chalk.gray('  ├─ ') +
    chalk.green.bold('Status: ') +
    chalk.greenBright('● ONLINE')
  );
  console.log(
    chalk.gray('  ├─ ') +
    chalk.blue.bold('Port: ') +
    chalk.yellow.bold(port.toString())
  );
  console.log(
    chalk.gray('  ├─ ') +
    chalk.magenta.bold('Started: ') +
    chalk.white(timestamp)
  );
  console.log(
    chalk.gray('  ├─ ') +
    chalk.cyan.bold('Environment: ') +
    chalk.white(process.env.NODE_ENV || 'development')
  );

  console.log('');
  console.log(
    chalk.gray('  └─ ') +
    chalk.green('Server ready at: ') +
    chalk.underline.blue(`http://localhost:${port}`)
  );

  console.log(divider);
  console.log(
    chalk.dim('  Press ') +
    chalk.yellow.bold('Ctrl+C') +
    chalk.dim(' to stop the server')
  );
  console.log('');
};