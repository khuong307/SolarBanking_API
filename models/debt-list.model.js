import db from '../utils/db.js';
import generate from "./generic.model.js";
const TABLE_NAME = 'debt_list';
export default {
    genericMethods: generate(TABLE_NAME, 'debt_id'),
    async listAll(userId,accountNumber){
        return db(TABLE_NAME).where('user_id',userId).orWhere('debt_account_number',accountNumber).select();
    },
    async getDebtById(debtId){
        const obj =  db(TABLE_NAME).where('debt_id',debtId).select();
        return obj.length > 0 ? obj[0] : null;
    },
    async updateStatusDebtPayment(debtId,status){
        return db(TABLE_NAME)
            .where({
                debt_id: debtId
            })
            .update({
                debt_status: status
            });
    },
    async updateTransIdDebtPayment(debtId,transId){
        return db(TABLE_NAME)
            .where({
                debt_id: debtId
            })
            .update({
                paid_transaction_id: transId
            });
    }
}