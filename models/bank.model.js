import generate from './generic.model.js';
import db from '../utils/db.js';
import * as dotenv from 'dotenv';

dotenv.config();

export default {
    genericMethods: generate('bank', 'bank_code'),
};