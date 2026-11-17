require('dotenv').config();
const app = require('./app');
const connectDatabase = require('./config/database');

const port = Number(process.env.PORT) || 5000;

async function start() {
  try {
    await connectDatabase();
    app.listen(port, () => console.log(`Inventory API listening at http://localhost:${port}`));
  } catch (error) {
    console.error(`Could not start the API: ${error.message}`);
    process.exitCode = 1;
  }
}

start();
