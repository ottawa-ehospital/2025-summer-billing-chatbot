const axios = require('axios');
require('dotenv').config();

const API_BASE = process.env.EHOSPITAL_API_BASE || 'https://tysnx3mi2s.us-east-1.awsapprunner.com/table';

const getTable = async (table) => {
  const { data } = await axios.get(`${API_BASE}/${table}`);
  return data;
};

const insertRow = async (table, rowObj) => {
  await axios.post(`${API_BASE}/${table}`, rowObj, { headers: { 'Content-Type': 'application/json' } });
};

module.exports = { getTable, insertRow }; 