import generate from './generic.model.js';
import db from '../utils/db.js';

export default {
    genericMethods: generate('user', 'user_id'),

    async findByEmail(email) {
        const ans = await db('user').where({email}).select();
        return ans.length > 0 ? ans[0] : null;
    },

    async checkExistBy(fullName,email,phone){
        const ans = await db('user').where({full_name:fullName}).andWhere({email:email}).andWhere({phone:phone})
        return ans.length > 0 ? true: false
    }
};