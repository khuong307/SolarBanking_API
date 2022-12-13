import generate from './generic.model.js';
import db from '../utils/db.js';
import * as dotenv from 'dotenv';

dotenv.config();

export default {
    genericMethods: generate('user', 'user_id'),

    async findByEmail(email) {
        const ans = await db('user').where({email}).select();
        return ans.length > 0 ? ans[0] : null;
    }
};