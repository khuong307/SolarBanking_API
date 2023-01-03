import generate from './generic.model.js';
import db from '../utils/db.js';
import * as dotenv from 'dotenv';
import moment from "moment/moment.js";

dotenv.config();

export default {
    genericMethods: generate('transaction', 'transaction_id'),
    async updateStatusTransaction(transactionId,is_success) {
        const res = await db('transaction')
            .where({
                transaction_id: transactionId
            })
            .update({
                is_success: is_success,
                transaction_created_at: moment().toDate()
            });
        return res
    },
    async updateOTPForPayDebt(transId,otp){
        const res = await db('transaction')
            .where({
                transaction_id: transId
            })
            .update({
                otp_code: otp,
                transaction_created_at: moment().add(process.env.otp_time, 's').toDate()
            });
        return res;
    },
    async getTransactionList(isExternal){
        return db('transaction')
            .join('banking_account as BA1', 'transaction.src_account_number', '=', 'BA1.account_number')
            .join('banking_account as BA2', 'transaction.des_account_number', '=', 'BA2.account_number')
            .join('bank as B1', 'BA1.bank_code', '=', 'B1.bank_code')
            .join('bank as B2', 'BA2.bank_code', '=', 'B2.bank_code')
            .join('transaction_type as TT1', 'transaction.transaction_type', '=', 'TT1.transaction_type_id')
            .select(["transaction.transaction_id", 
                "transaction.src_account_number", "B1.bank_name as src_bank_name", "B1.bank_code as src_bank_code",
                "transaction.des_account_number", "B2.bank_name as des_bank_name", "B2.bank_code as des_bank_code",
                "transaction.transaction_amount", "transaction.transaction_message", 
                "transaction.pay_transaction_fee", "transaction.transaction_created_at", 
                "TT1.transaction_type_name", "transaction.is_success"])
    }
};