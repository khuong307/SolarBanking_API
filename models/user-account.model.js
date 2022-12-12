import generate from './generic.model.js';
import moment from 'moment';
import db from '../utils/db.js';
import * as dotenv from 'dotenv';

dotenv.config();

export default {
    genericMethods: generate('user_account', 'username'),

    updateLastExpiredAt(username) {
        return db('user_account')
            .where({username})
            .update({
                last_expired_at: moment().add(process.env.refresh_token_time, 's').toDate()
            });
    },

    async findByUserId(id) {
        const ans = await db('user_account').where('user_id', id).select();
        return ans.length > 0 ? ans[0] : null;
    },

    updatePassword(username, hashedPassword) {
        return db('user_account')
            .where({username})
            .update({
                password: hashedPassword
            });
    }
};