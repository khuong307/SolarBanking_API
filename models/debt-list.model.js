import db from '../utils/db.js';
import generate from "./generic.model.js";
const tableName = 'debt_list';
export default {
    genericMethods: generate('debt_list', 'debt_id'),
    async listAll(userId,accountNumber){
        return db(tableName).where('user_id',userId).orWhere('debt_account_number',accountNumber).select();
    },
    async getDebtById(debtId){
        const obj =  db(tableName).where('debt_id',debtId).select();
        return obj.length > 0 ? obj[0] : null;
    },
    async updateStatusDebtPayment(debtId,status){
        return db(tableName)
            .where({
                debt_id: debtId
            })
            .update({
                debt_status: status
            });
    }
}