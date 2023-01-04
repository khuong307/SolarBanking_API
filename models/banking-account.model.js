import generate from './generic.model.js';
import db from '../utils/db.js';
import { BANK_CODE } from '../utils/bank_constanst.js';

export default {
    genericMethods: generate('banking_account', 'account_number'),

    findByUserId(userId) {
        return db('banking_account').where('user_id', userId).select();
    },

    findByUserIdAndAccountType(userId, accountType) {
        return db('banking_account').where({
            user_id: userId,
            is_spend_account: accountType
        }).select();
    },
    async getInfoRecipientBy(account_number){
        const res = await db('banking_account').where('account_number',account_number)
            .join('user','banking_account.user_id','=','user.user_id')
            .select('banking_account.user_id',
                'user.full_name',
                'user.email',
                'user.phone',
                'banking_account.balance');
        return res;
    },
    async getInfoRecipientById(userId){
        const res = await db('banking_account').where('user_id',userId)
            .join('user','banking_account.user_id','=','user.user_id')
            .select('user.user_id',
                'user.full_name',
                'user.email',
                'user.phone',
                'banking_account.balance',
                'banking_account.account_number');
        return res;
    },
    async updateAccountBalance(paramUser,amount,type){
        const obj = await db('banking_account').where('account_number',paramUser)
                                         .orWhere('user_id',paramUser).select();
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
            await db('banking_account').where('account_number',paramUser)
                                       .orWhere('user_id',paramUser)
                                        .update('balance',balance);
            return true;
        }
        return false;
    },
    async checkBalanceOfUserByAccountNumber (accountNumber,amount){
        const obj = await db('banking_account').where('account_number',accountNumber).select();
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
    },
    async checkExistBy(accountNumber,bankCode){
        const ans = await db('banking_account').where('account_number',accountNumber).andWhere('bank_code',bankCode).select()
        return ans.length > 0 ? true:false
    },
    async findByUserIdAndBankCode(userId){
        const res = await db('banking_account').where('user_id',userId).andWhere('bank_code',BANK_CODE).andWhere("is_spend_account",1).select()
        return res.length !== 0 ? res[0] : null
    },

    async getInfoUserBy(account_number){
        const res = await db('banking_account').where('account_number',account_number)
            .join('user','banking_account.user_id','=','user.user_id')
            .select('user.user_id',
                'user.full_name',
                'user.email',
                'user.phone',
                'banking_account.balance');
        return res.length !==0 ? res[0] :null
    }
};