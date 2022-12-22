import db from '../utils/db.js';
import generate from "./generic.model.js";

const TABLE_NAME = 'debt_list';
export default {
    genericMethods: generate(TABLE_NAME, 'debt_id'),
    listSelfMade(userId){
        return db(TABLE_NAME).where('user_id',userId).select();
    },
    listOtherMade(accountNumber){
        return db(TABLE_NAME).where('debt_account_number', accountNumber).select();
    },
    async getDebtById(debtId){
        const obj =  await db(TABLE_NAME).where('debt_id',debtId).select();
        return obj.length > 0 ? obj[0] : null;
    },
    updateStatusDebtPayment(debtId,status){
        return db(TABLE_NAME)
            .where({
                debt_id: debtId
            })
            .update({
                debt_status: status
            });
    },
    updateTransIdDebtPayment(debtId,transId){
        return db(TABLE_NAME)
            .where({
                debt_id: debtId
            })
            .update({
                paid_transaction_id: transId
            });
    }

}