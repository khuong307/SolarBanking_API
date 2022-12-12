import express from 'express';
import bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { readFile } from 'fs/promises';

import jwt from '../utils/jwt.js';
import userAccountModel from '../models/user-account.model.js';
import userTypeModel from '../models/user-type.model.js';
import validate from '../middlewares/validate.mdw.js';
import {authUser} from '../middlewares/auth.mdw.js';

dotenv.config();

const userAccountSchema = JSON.parse(await readFile(new URL('../schemas/user-account.json', import.meta.url)));

const router = express.Router();

const SALT_ROUNDS = 10;
const salt = bcrypt.genSaltSync(SALT_ROUNDS);

router.post('/authentication', validate(userAccountSchema), async function(req, res) {
    const username = req.body.username;
    const password = req.body.password;

    const account = await userAccountModel.genericMethods.findById(username);
    if (account !== null) {
        const hashedPassword = account.password;
        if (!bcrypt.compareSync(password, hashedPassword))
            return res.status(400).json({
                isSuccess: false,
                message: "Username or password is incorrect!"
            });

        const refreshToken = account['refresh_token'];
        const accessToken = jwt.generateToken(username, process.env.access_token_secret, process.env.access_token_time);
        const userType = await userTypeModel.findById(account.user_type_id);

        await userAccountModel.updateLastExpiredAt(username);

        return res.json({
            isSuccess: true,
            message: 'Login successfully!',
            accessToken,
            refreshToken,
            account: {
                user_id: account.user_id,
                username,
                role: userType.user_type_name
            }
        });
    }
    else
        return res.status(400).json({
            isSuccess: false,
            message: "Username or password is incorrect!"
        });
});

router.put('/:username/password', authUser, async function(req, res) {
    const username = req.params.username;
    const oldPassword = req.body.old_password || '';
    const newPassword = req.body.new_password || '';

    const account = await userAccountModel.genericMethods.findById(username);
    if (account !== null) {
        const hashedPassword = account.password;
        if (!bcrypt.compareSync(oldPassword.toString(), hashedPassword))
            return res.status(400).json({
                isSuccess: false,
                message: "Old password is incorrect!"
            });

        const newHashedPassword = await bcrypt.hash(newPassword.toString(), salt);
        await userAccountModel.updatePassword(username, newHashedPassword);

        return res.json({
            isSuccess: true,
            message: 'Change password successfully!'
        });
    }
    else
        return res.status(400).json({
            isSuccess: false,
            message: "Wrong username!"
        });
});

export default router;