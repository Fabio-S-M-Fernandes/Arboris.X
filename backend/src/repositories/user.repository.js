const { readDatabase, updateDatabase } = require('../store/jsonStore');

const findByEmail = (email) => readDatabase().users.find((user) => user.email === email);
const findById = (id) => readDatabase().users.find((user) => user.id === id);
const create = (user) => updateDatabase((database) => { database.users.push(user); return user; });

module.exports = { create, findByEmail, findById };
