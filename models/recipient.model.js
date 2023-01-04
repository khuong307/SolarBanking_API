import generate from './generic.model.js';
import db from '../utils/db.js';

export default {
    genericMethods: generate('recipient_list', 'user_id'),

    findByUserId(userId) {
        return db('recipient_list').where({
            user_id: userId
        }).select('account_number', 'nick_name');
    },

    findByUserIdAndAccountNumber(userId, accountNumber) {
        return db('recipient_list').where({
            user_id: userId,
            account_number: accountNumber
        }).select();
    },

    updateNickNameByUserIdAndAccountNumber(userId, accountNumber, nickname) {
        return db('recipient_list').where({
            user_id: userId,
            account_number: accountNumber
        }).update({
            nick_name: nickname
        });
    },

    deleteByUserIdAndAccountNumber(userId, accountNumber) {
        return db('recipient_list').where({
            user_id: userId,
            account_number: accountNumber
        }).del();
    },

    async checkExistByUserIdAndAccountNumber(userId,accountNumber){
        const ans = await db('recipient_list').where({
            user_id: userId,
            account_number: accountNumber
        }).select();
        return ans.length > 0 ? true : false
    }
};