import db from '../utils/db.js';
import generate from './generic.model.js';

export default {
    genericMethods: generate('transaction', 'transaction_id'),
    async findTransactionNotSuccessById(transactionId){
        const ans = await db('transaction').where({transaction_id:transactionId}).andWhere({is_success:0}).select()
        return ans.length > 0 ? ans[0] : null  
    }
};