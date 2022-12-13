import jwt from '../utils/jwt.js';
import userAccountModel from '../models/user-account.model.js';
import userTypeModel from '../models/user-type.model.js';
import moment from 'moment';
import * as dotenv from 'dotenv';

dotenv.config();

export async function authUser(req, res, next) {
    const accessToken = req.headers.access_token;
    const refreshToken = req.headers.refresh_token;
    const secretKey = process.env.access_token_secret;

    if (!accessToken) {
        return res.status(401).json({
            message: 'Unauthorized user!'
        });
    }

    let tokenInfo = await jwt.verifyToken(accessToken, secretKey);
    if (tokenInfo === null) {
        tokenInfo = await jwt.decodeToken(accessToken, secretKey);
        if (tokenInfo === null)
            return res.status(401).json({
                message: 'Unauthorized user'
            });

        const username = tokenInfo.payload;
        const account = await userAccountModel.genericMethods.findById(username);

        if (account['refresh_token'] === refreshToken && moment().isBefore(account['last_expired_at'])) {
            const newAccessToken = await jwt.generateToken(username, secretKey, process.env.access_token_time);

            return res.json({
                accessToken: newAccessToken
            });
        }
        else
            return res.status(401).json({
                message: 'Unauthorized user'
            });
    }

    next();
}

export function authRole(role) {
    return async function (req, res, next) {
        const userId = req.body.user_id;
        const account = await userAccountModel.findByUserId(userId);
        const userType = await userTypeModel.findById(account.user_type_id);

        if (role !== userType.user_type_name)
            return res.status(403).json({
                message: 'Not allowed user!'
            });

        next();
    }
}
