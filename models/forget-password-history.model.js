import generate from './generic.model.js';
import db from '../utils/db.js';

export default {
    genericMethods: generate('forget_password_history', 'user_id'),

    async findLastChangeById(id) {
        const ans = await db('forget_password_history').where({
            user_id: id
        }).select();
        return ans.length > 0 ? ans[ans.length - 1] : null;
    },

    async updateLastChange(userId, time, entity) {
        return db('forget_password_history')
            .where({
                user_id: userId,
                reset_at: time
            })
            .update(entity);
    }
};