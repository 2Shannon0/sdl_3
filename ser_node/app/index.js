require("dotenv").config();

const readline = require('node:readline');
const { stdin: input, stdout: output } = require('node:process');
const rl = readline.createInterface({ input, output });

function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function toConnect() {
  try {
    const user = await askQuestion('Введите имя пользователя!!: ');
    const pass = await askQuestion('Введите пароль: ');
    rl.close();

    const { Client } = require('pg');
    const client = new Client({
      user: user, // process.env.DB_USER,
      password: pass, // process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME
    });

    client
      .connect()
      .then(() => {
        console.log('Подключено к базе данных PostgreSQL');

        client.query('SELECT * FROM Authors;', (err, result) => {
          if (err) {
            console.error('Ошибка при выполнении запроса:', err.message);
          } else {
            console.log('Таблица Authors:\n', result.rows);
          }
        
          client
            .end()
            .then(() => {
              console.log('Подключение к базе данных PostgreSQL закрыто');
            })
            .catch((err) => {
              console.error('Ошибка при отключении: ', err.message);
            });
        });
      })
      .catch((err) => {
        console.error('Ошибка при подключение к базе данных PostgreSQL', err.message);
      });
  } catch (err) {
    console.error('Ошибка:', err.message);
    rl.close();
  }
}

toConnect();