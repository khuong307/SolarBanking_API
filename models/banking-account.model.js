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
    async getInfoRecipientBy(account_number){
        const res = db('banking_account').where('account_number',account_number)
            .join('user','account_number.user_id','=','user.user_id')
            .select('user.user_id',
                    'user.full_name',
                    'user.email',
                    'banking_account.balance')
        return res;
    },
    async updateAccountBalance(accountNumber,amount,type){
        const obj = db('banking_account').where('account_number',accountNumber)
                                         .orWhere('user_id',accountNumber).select();
        let balance
        if (obj.length > 0){
            //payment
            if (type === 1){
                balance = parseInt(obj[0].balance - amount);
            }
            //topUp
            else{
                balance = parseInt(obj[0].balance + amount);
            }
            db('banking_account').where('account_number',accountNumber).update('balance',balance);
            return true;
        }
        return false;
    },
    async checkBalanceOfUserByAccountNumber (accountNumber,amount){
        const obj = db('banking_account').where('account_number',accountNumber).select();
        if (obj.length > 0){
            return amount <= obj[0].balance;
        }
        return false;
    },

    findByUserIdAndAccountNumber(userId,accountNumber){
        return db('banking_account').where('account_number',accountNumber).andWhere('user_id',userId).select()
    },

    findByAccountNumberAndBankCode(accountNumber,bankCode){
        return db('banking_account').where('account_number',accountNumber).andWhere('bank_code',bankCode).select()
    }
};