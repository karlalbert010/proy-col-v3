/* eslint-disable no-console */
const { execSync } = require('child_process');

function run(command) {
  console.log(`\n> ${command}`);
  execSync(command, { stdio: 'inherit' });
}

function main() {
  run('npx prisma generate');
  run('npx prisma db push');
  run('npm run seed:auth');
  run('npm run seed:base');
}

try {
  main();
  console.log('\nDB init completado.');
} catch (error) {
  console.error('\nDB init fallo:', error.message);
  process.exitCode = 1;
}
