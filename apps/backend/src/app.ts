import express from 'express';
import path from 'path';
import sequelize from './utils/database';

const app = express();

app.use(express.json());
