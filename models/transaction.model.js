import db from '../utils/db.js';
import generate from './generic.model.js';

export default {
    genericMethods: generate('transaction', 'transaction_id'),
    async findTransactionNotSuccessById(transactionId){
        const ans = await db('transaction').where({transaction_id:transactionId}).andWhere({is_success:0}).select()
        return ans.length > 0 ? ans[0] : null  
    },

    async findInfoTransaction(transactionId){
        const ans = await db.from("transaction").where({transaction_id:transactionId}).
        join("banking_account",function(){
            this.on("banking_account.account_number","=","transaction.src_account_number")
            .orOn("banking_account.account_number","=","transaction.des_account_number")
        }).join("user",function(){
            this.on("user.user_id","=","banking_account.user_id")
            .orOn("user.user_id","=","banking_account.user_id")
        }).select("*")
        return ans.length > 0 ? ans : null
    }
};