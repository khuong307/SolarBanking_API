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
                is_success: 1,
                transaction_created_at: moment().toDate()
            });
        return res
    },
};