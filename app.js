import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import morgan from 'morgan';
import asyncError from 'express-async-errors';
import swaggerUI from 'swagger-ui-express';
import swaggerJsDoc from 'swagger-jsdoc';
import { swaggerConfigOptions } from './config/swagger.config.js';

import actorRoute from './routes/actor.route.js';
import categoryRoute from './routes/category.route.js';
import filmRoute from './routes/film.route.js';

const app = express();
app.use(express.json());
app.use(morgan('dev'));

const specs = swaggerJsDoc(swaggerConfigOptions);
app.use(
    "/api-docs", swaggerUI.serve, swaggerUI.setup(specs)
);

app.use('/api/actors', actorRoute);
app.use('/api/categories', categoryRoute);
app.use('/api/films', filmRoute);

app.get('/err', function (req, res) {
  throw new Error('Error!');
});

app.use(function (req, res) {
  res.status(404).json({
    error: 'Endpoint not found!'
  });
});

app.use(function (err, req, res, next) {
  console.log(err.stack);
  res.status(500).json({
    error: 'Something wrong!'
  });
});

const PORT = process.env.app_port;
app.listen(PORT, function () {
  console.log(`Sakila API is listening at http://localhost:${PORT}`);
})
