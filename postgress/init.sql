-- Создание базы данных
CREATE DATABASE task_db;

-- Подключение к базе данных sdl_3_db
\connect task_db

-- Создание таблицы Authors
CREATE TABLE Authors (
    author_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    birth_date DATE
);

-- Создание таблицы Books
CREATE TABLE Books (
    book_id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    genre VARCHAR(50),
    published_date DATE,
    author_id INTEGER NOT NULL,
    FOREIGN KEY (author_id) REFERENCES Authors(author_id)
);

-- Создание таблицы Readers
CREATE TABLE Readers (
    reader_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    membership_date DATE NOT NULL
);

-- Создание таблицы Orders
CREATE TABLE Orders (
    order_id SERIAL PRIMARY KEY,
    reader_id INTEGER NOT NULL,
    book_id INTEGER NOT NULL,
    order_date DATE NOT NULL,
    return_date DATE,
    FOREIGN KEY (reader_id) REFERENCES Readers(reader_id),
    FOREIGN KEY (book_id) REFERENCES Books(book_id)
);

-- Пример вставки данных в таблицу Authors
INSERT INTO Authors (first_name, last_name, birth_date)
VALUES
('Leo', 'Tolstoy', '1828-09-09'),
('Fyodor', 'Dostoevsky', '1821-11-11'),
('Jane', 'Austen', '1775-12-16'),
('Alex', 'Tolstoy', '1883-01-10');


-- Пример вставки данных в таблицу Books
INSERT INTO Books (title, genre, published_date, author_id)
VALUES
('War and Peace', 'Historical Fiction', '1869-01-01', 1),
('Crime and Punishment', 'Philosophical Fiction', '1866-01-01', 2),
('Pride and Prejudice', 'Romantic Fiction', '1813-01-28', 3);

-- Пример вставки данных в таблицу Readers
INSERT INTO Readers (first_name, last_name, membership_date)
VALUES
('John', 'Doe', '2023-01-01'),
('Jane', 'Smith', '2023-02-15'),
('Emily', 'Johnson', '2023-03-20');

-- Пример вставки данных в таблицу Orders
INSERT INTO Orders (reader_id, book_id, order_date, return_date)
VALUES
(1, 1, '2023-06-01', '2023-06-15'),
(2, 2, '2023-06-10', NULL),
(3, 3, '2023-06-15', NULL);

-- Создание роли пользователя
CREATE ROLE sdl_user LOGIN PASSWORD 'password';

-- Разрешение на использование схемы public для sdl_user
GRANT USAGE ON SCHEMA public TO sdl_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "sdl_user";

GRANT SELECT, INSERT, UPDATE, DELETE ON Authors TO "sdl_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON Books TO "sdl_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON Readers TO "sdl_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON Orders TO "sdl_user";