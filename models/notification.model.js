import generate from './generic.model.js';
import db from '../utils/db.js';
import * as dotenv from 'dotenv';

dotenv.config();

export default {
    genericMethods: generate('notification', 'notification_id'),

    getNotificationsByUserId(userId, limit) {
        return db('notification')
            .where({user_id: userId})
            .orderBy('notification_created_at', 'desc')
            .limit(limit);
    },

    updateIsSeen(notificationId) {
        return db('notification')
            .where({notification_id: notificationId})
            .update({
                is_seen: 1
            });
    }
};