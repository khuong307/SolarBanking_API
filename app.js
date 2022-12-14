import * as dotenv from 'dotenv';

dotenv.config();

import express from 'express';
import morgan from 'morgan';
import asyncError from 'express-async-errors';
import cors from 'cors'
import swaggerUI from 'swagger-ui-express';
import swaggerJsDoc from 'swagger-jsdoc';
import {swaggerConfigOptions} from './utils/swagger.js';
import http from 'http';
import {Server} from 'socket.io';

import userAccountRoute from './routes/user-account.route.js';
import userRoute from './routes/user.route.js';
import debtListRoute from "./routes/debt-list.route.js";
import employeeRoute from "./routes/employee.route.js";
import customerRoute from "./routes/customer.route.js";
import adminRoute from "./routes/admin.route.js";
import bankRoute from "./routes/bank.route.js";

const app = express();

app.use(express.json());
app.use(morgan('dev'));
app.use(cors())

const specs = swaggerJsDoc(swaggerConfigOptions);
app.use(
    "/api-docs", swaggerUI.serve, swaggerUI.setup(specs)
);

app.use('/api/accounts', userAccountRoute);
app.use('/api/users', userRoute);
app.use('/api/debtList', debtListRoute);
app.use('/api/employee', employeeRoute);
app.use('/api/customers',customerRoute);
app.use('/api/admin',adminRoute);
app.use('/api/banks',bankRoute);

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
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*'
    }
});

io.on('connection', (socket) => {
    console.log('A user is connected');
});

server.listen(PORT, function () {
    console.log(`Sakila API is listening at http://localhost:${PORT}`);
});

export default io;