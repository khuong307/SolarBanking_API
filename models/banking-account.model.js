import generate from './generic.model.js';
import db from '../utils/db.js';

export default {
    genericMethods: generate('banking_account', 'account_number'),

    findByUserId(userId) {
        return db('banking_account').where({
            user_id: userId
        }).select();
    },

    findByUserIdAndAccountType(userId, accountType) {
        return db('banking_account').where({
            user_id: userId,
            is_spend_account: accountType
        }).select();
    },
    async findUserIdByAccountNumber(accountNumber){
        const bankingAccount = db('banking_account').where('account_number',accountNumber).select();
        return bankingAccount.length > 0 ? bankingAccount[0].user_id : 0;
    }
};