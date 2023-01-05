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
    },

    async checkExistByFullName(fullName){
        const ans = await db("user").where({full_name:fullName})
        return ans.length > 0 ? true :false
    },

    async findAllUser(role) {
        return await db('user_account')
        .join('user', 'user.user_id', '=', 'user_account.user_id')
        .join('user_type', 'user_account.user_type_id','=','user_type.user_type_id')
        .where("user_type.user_type_name","=",role)
        .select(["user.user_id", "user.full_name", "user.email", "user.phone", "user_account.username"])
    }
};