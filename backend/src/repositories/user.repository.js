const { readDatabase, updateDatabase } = require('../store/jsonStore');

const findByEmail = (email) => readDatabase().users.find((user) => user.email === email);
const findById = (id) => readDatabase().users.find((user) => user.id === id);
const findByGoogleSub = (googleSub) => readDatabase().users.find((user) => user.googleSub === googleSub);
const create = (user) => updateDatabase((database) => { database.users.push(user); return user; });
const createIfUnique = (user) => updateDatabase((database) => {
  if (database.users.some((entry) => entry.email === user.email || (user.googleSub && entry.googleSub === user.googleSub))) return null;
  database.users.push(user);
  return user;
});
const removeIfId = (id) => updateDatabase((database) => {
  const index = database.users.findIndex((user) => user.id === id);
  if (index < 0) return false;
  database.users.splice(index, 1);
  return true;
});
const attachGoogleSubIfUnlinked = (userId, googleSub) => updateDatabase((database) => {
  if (database.users.some((user) => user.googleSub === googleSub && user.id !== userId)) return false;
  const user = database.users.find((entry) => entry.id === userId);
  if (!user || (user.googleSub && user.googleSub !== googleSub)) return false;
  user.googleSub = googleSub;
  return true;
});

const registerDevice = (userId, device) => updateDatabase((database) => {
  const user = database.users.find((entry) => entry.id === userId);
  if (!user) return null;
  if (!Array.isArray(user.devices)) user.devices = [];
  const existing = user.devices.find((entry) => entry.tokenHash === device.tokenHash);
  if (existing) {
    existing.lastSeenAt = device.lastSeenAt;
    existing.browser = device.browser;
    existing.operatingSystem = device.operatingSystem;
    existing.deviceType = device.deviceType;
    return { isNew: false, device: existing };
  }
  user.devices.push(device);
  if (user.devices.length > 25) {
    user.devices.sort((left, right) => left.lastSeenAt.localeCompare(right.lastSeenAt));
    user.devices.splice(0, user.devices.length - 25);
  }
  return { isNew: true, device };
});

module.exports = { attachGoogleSubIfUnlinked, create, createIfUnique, findByEmail, findByGoogleSub, findById, registerDevice, removeIfId };
