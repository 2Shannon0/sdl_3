require("dotenv").config();

const readline = require('node:readline');
const { stdin: input, stdout: output } = require('node:process');
const rl = readline.createInterface({ input, output });
const fs = require('fs');
function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function toConnect() {
  try {
    const user = await askQuestion('Введите имя пользователя: ');
    const pass = await askQuestion('Введите пароль: ');

    const { Client } = require('pg');
    const client = new Client({
      user: user, // process.env.DB_USER,
      password: pass, // process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME
    });
    await client.connect();
    console.log('Подключено к базе данных PostgreSQL');
    fs.appendFileSync('./log/log.txt', `Подключено к базе данных PostgreSQL \n`);
    await performActions(client);
  } catch (err) {
    console.error('Ошибка:', err);
    fs.appendFileSync('./log/log.txt', `Ошибка!' ${err}\n`);
  } finally {
    rl.close();
  }
}
async function performActions(client) {
  let exitA = false;
  let exitT = false;
  let curTable
  while (!exitT) {
    const tableList = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';`);
    // console.log(tableList.rows)
    console.log('\nВыберите таблицу для работы:');
    fs.appendFileSync('./log/log.txt', `\nВыберите таблицу для работы:\n`);
    for (let i = 0; i < tableList.rows.length; i++) {
      console.log(`${i+1}: ${tableList.rows[i].table_name}`)
      fs.appendFileSync('./log/log.txt', `${i+1}: ${tableList.rows[i].table_name}\n`);
    }
    let action = false
    while (!action) {
      
        const curTableNumber = await askQuestion('Введите номер тыблицы: ');
        if (curTableNumber === 'exit') {
          await client.end();
          exitA = true
          exitT = true
          action = true
        } else {
          try {
            curTable = tableList.rows[curTableNumber-1].table_name
            action = true
            exitA = false;
          } catch (err) {
            console.error('Ошибка:', err);
            fs.appendFileSync('./log/log.txt', `Ошибка!' ${err}\n`);
          }
        }
    }
    
    while (!exitA) {
      console.log(`Текущая таблица: ${curTable}`)
      console.log('\nВыберите действие:');
      console.log('1. Просмотреть таблицу');
      console.log('2. Обновить таблицу');
      console.log('3. Внести в таблицу');
      console.log('4. Выйти');
      fs.appendFileSync('./log/log.txt', `Текущая таблица: ${curTable}\n`);
      fs.appendFileSync('./log/log.txt', '\nВыберите действие:\n');
      fs.appendFileSync('./log/log.txt', '1. Просмотреть таблицу\n');
      fs.appendFileSync('./log/log.txt', '2. Обновить таблицу\n');
      fs.appendFileSync('./log/log.txt', '3. Внести в таблицу\n');
      fs.appendFileSync('./log/log.txt', '4. Выйти\n');

  
      const choice = await askQuestion('Введите номер действия: ');
  
      switch (choice) {
        case '1':
          await viewTable(client, curTable);
          break;
        case '2':
          await updateTable(client, curTable);
          break;
        case '3':
          await insertIntoTable(client, curTable);
          break;
        case '4':
          exitA = true;
          break;
        default:
          console.log('Некорректный выбор. Попробуйте еще раз.');
          fs.appendFileSync('./log/log.txt', 'Некорректный выбор. Попробуйте еще раз.\n');
      }
    }
  }

  await client.end();
  console.log('Подключение к базе данных PostgreSQL закрыто');
}

async function viewTable(client, curTable) {
  console.log(`\nПросмотр таблицы ${curTable}:`);
  console.log('1. Без фильтрации');
  console.log('2. С фильтрацией по нескольким значениям');

  const choice = await askQuestion('Введите номер действия: ');

  let query = `SELECT * FROM ${curTable}`;
  let conditions = [];
  let values = [];
  let paramIndexVal = 1;
  const columns = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${curTable}' AND table_schema = 'public';`)
  const whiteListColumns = columns.rows.map((el) => el.column_name);

  switch (choice) {
    case '2':
      let moreFilters = true;
      while (moreFilters) {
        const column = await askQuestion('Введите имя столбца для фильтрации: ');
        if (whiteListColumns.includes(column)) {

          const value = await askQuestion('Введите значение для фильтрации: ');
  
          conditions.push(`${column} = $${paramIndexVal}`);
          values.push(value);
          paramIndexVal++
          const more = await askQuestion('Добавить еще одно условие? (д/н): ');
          if (more.toLowerCase() !== 'д') {
            moreFilters = false;
          }
        } else {
          console.log('В таблице нет такого столбца.')
        }
      }
      break;
    case '1':
    default:
      break;
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  try {
    const result = await client.query(query, values);
    console.log('Результаты:\n');
    console.table(result.rows)
  } catch (err) {
    console.error('Ошибка при выполнении запроса:', err.message);
  }
}

async function updateTable(client, curTable) {
  console.log(`\nОбновление таблицы ${curTable}:`);
  console.log('1. Обновить одну запись');
  console.log('2. Обновить несколько записей');

  const choice = await askQuestion('Введите номер действия: ');

  const columns = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${curTable}' AND table_schema = 'public';`)
  const whiteListColumns = columns.rows.map((el) => el.column_name);

  switch (choice) {
    case '1':
      await updateSingleRecord(client, curTable, whiteListColumns);
      break;
    case '2':
      await updateMultipleRecords(client, curTable, whiteListColumns);
      break;
    default:
      console.log('Некорректный выбор. Попробуйте еще раз.');
  }
}

async function updateSingleRecord(client, curTable, whiteListColumns) {
  let askFlag = false
  let idColumn 
  while (!askFlag) {

    idColumn = await askQuestion('Введите имя столбца для идентификации записи: ');
    if (whiteListColumns.includes(idColumn)) {
      askFlag = true
      break
    }
    console.log('Такого столбца не существует.\n')
  }
  // const idColumn = 'id'; // Предполагается, что во всех таблицах есть столбец id
  const id = await askQuestion('Введите id записи для обновления: ');

  const updates = [];
  const values = [];
  let paramIndex = 1;

  let moreUpdates = true;
  while (moreUpdates) {
    const column = await askQuestion('Введите имя столбца для обновления: ');
    if (whiteListColumns.includes(column) && column !== idColumn) {
      const value = await askQuestion(`Введите новое значение для ${column}: `);
      updates.push(`${column} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
      const more = await askQuestion('Обновить еще один столбец? (д/н): ');
      if (more.toLowerCase() !== 'д') {
        moreUpdates = false;
      }
    } else {
      console.log('Некорректное имя столбца или попытка обновить столбец id. Попробуйте еще раз.');
    }
  }

  if (updates.length > 0) {
    const query = `UPDATE ${curTable} SET ${updates.join(', ')} WHERE ${idColumn} = $${paramIndex}`;
    values.push(id);
    try {
      console.log(query)
      console.log(values)
      await client.query(query, values);
      console.log('Запись успешно обновлена.');
    } catch (err) {
      console.error('Ошибка при обновлении записи:', err.message);
    }
  } else {
    console.log('Нет обновлений для выполнения.');
  }
}

async function updateMultipleRecords(client, curTable, whiteListColumns) {
  const columnToFilter = await askQuestion('Введите имя столбца для фильтрации: ');
  if (!whiteListColumns.includes(columnToFilter)) {
    console.log('Некорректное имя столбца. Попробуйте еще раз.');
    return;
  }
  const valueToFilter = await askQuestion('Введите значение для фильтрации: ');

  const columnToUpdate = await askQuestion('Введите имя столбца для обновления: ');
  if (!whiteListColumns.includes(columnToUpdate)) {
    console.log('Некорректное имя столбца. Попробуйте еще раз.');
    return;
  }
  const newValue = await askQuestion(`Введите новое значение для ${columnToUpdate}: `);

  const query = `UPDATE ${curTable} SET ${columnToUpdate} = $1 WHERE ${columnToFilter} = $2`;
  const values = [newValue, valueToFilter];

  try {
    console.log(query)
    console.log(values)
    await client.query(query, values);
    console.log('Записи успешно обновлены.');
  } catch (err) {
    console.error('Ошибка при обновлении записей:', err.message);
  }
}

async function insertIntoTable(client, curTable) {
  console.log(`\nВнесение данных в таблицу ${curTable}:`);
  console.log('1. Внести одну строку');
  console.log('2. Внести одну строку в несколько связанных таблиц');
  console.log('3. Внести несколько строк в одну таблицу');
  // console.log('4. Внести несколько строк в несколько связанных таблиц');

  const choice = await askQuestion('Введите номер действия: ');

  switch (choice) {
    case '1':
      await insertSingleRow(client, curTable);
      break;
    case '2':
      await insertIntoLinkedTables(client)
      break;
    case '3':
      await insertMultipleRows(client, curTable);
      break;
    // case '4':
    //   break;
    default:
      console.log('Некорректный выбор. Попробуйте еще раз.');
  }
}

async function insertSingleRow(client, curTable) {
  const columns = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${curTable}' AND table_schema = 'public';`)
  const whiteListColumns = columns.rows.map((el) => el.column_name).filter(col => !col.includes('id'));

  const values = [];
  for (const column of whiteListColumns) {
      const value = await askQuestion(`Введите значение для ${column}: `);
      values.push(value);
  }

  const query = `INSERT INTO ${curTable} (${whiteListColumns.join(', ')}) VALUES (${values.map((_, i) => `$${i + 1}`).join(', ')})`;

  try {
    await client.query(query, values);
    console.log('Данные успешно внесены.');
  } catch (err) {
    console.error('Ошибка при внесении данных:', err.message);
  }
}

async function insertMultipleRows(client, curTable) {
  const columns = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${curTable}' AND table_schema = 'public';`)
  const whiteListColumns = columns.rows.map((el) => el.column_name).filter(col => !col.includes('id'));

  const rows = [];
  let moreRows = true;
  while (moreRows) {
    const values = [];
    for (const column of whiteListColumns) {
      const value = await askQuestion(`Введите значение для ${column}: `);
      values.push(value);
    }
    rows.push(values);
    const more = await askQuestion('Добавить еще одну строку? (д/н): ');
    if (more.toLowerCase() !== 'д') {
      moreRows = false;
    }
  }

  const query = `INSERT INTO ${curTable} (${whiteListColumns.join(', ')}) VALUES ${rows.map(row => `(${row.map((_, i) => `$${i + 1}`).join(', ')})`).join(', ')}`;

  try {
    for (const values of rows) {
      await client.query(query, values);
    }
    console.log('Данные успешно внесены.');
  } catch (err) {
    console.error('Ошибка при внесении данных:', err.message);
  }
}
async function insertIntoLinkedTables(client) {
  try {
    console.log('\nВнесение нового читателя:');
    const firstName = await askQuestion('Введите имя читателя: ');
    const lastName = await askQuestion('Введите фамилию читателя: ');
    const membershipDate = await askQuestion('Введите дату вступления в читатели (гггг-мм-дд): ');

    const readerInsertQuery = `
      INSERT INTO Readers (first_name, last_name, membership_date)
      VALUES ($1, $2, $3)
      RETURNING reader_id`;
    const readerValues = [firstName, lastName, membershipDate];
    const readerResult = await client.query(readerInsertQuery, readerValues);
    const readerId = readerResult.rows[0].reader_id;

    console.log('\nВнесение заказа:');
    const bookId = await askQuestion('Введите ID книги для заказа: ');
    const orderDate = await askQuestion('Введите дату заказа (гггг-мм-дд): ');

    const orderInsertQuery = `
      INSERT INTO Orders (reader_id, book_id, order_date)
      VALUES ($1, $2, $3)`;
    const orderValues = [readerId, bookId, orderDate];
    await client.query(orderInsertQuery, orderValues);

    console.log('Данные успешно внесены в связанные таблицы Readers и Orders.');
  } catch (err) {
    console.error('Ошибка при внесении данных в связанные таблицы:', err.message);
  }
}
toConnect();
