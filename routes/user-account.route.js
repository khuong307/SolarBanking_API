import express from 'express';
import bcrypt from 'bcrypt';
import moment from 'moment';
import * as dotenv from 'dotenv';
import { readFile } from 'fs/promises';

import jwt from '../utils/jwt.js';
import createOTP from '../utils/otp.js';
import sendEmail from '../utils/mail.js';
import userAccountModel from '../models/user-account.model.js';
import userTypeModel from '../models/user-type.model.js';
import userModel from '../models/user.model.js';
import forgetPasswordHistoryModel from '../models/forget-password-history.model.js';
import validate, {validateParams} from '../middlewares/validate.mdw.js';
import {authUser} from '../middlewares/auth.mdw.js';

dotenv.config();

const userAccountSchema = JSON.parse(await readFile(new URL('../schemas/user-account.json', import.meta.url)));

const router = express.Router();

const SALT_ROUNDS = 10;
const salt = bcrypt.genSaltSync(SALT_ROUNDS);

// Login API
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
        const accessToken = await jwt.generateToken(username, process.env.access_token_secret, process.env.access_token_time);
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

// Change password API
router.put('/:userId/password', validateParams, authUser, async function(req, res) {
    const userId = +req.params.userId || 0;
    const oldPassword = req.body.old_password || '';
    const newPassword = req.body.new_password || '';

    const account = await userAccountModel.findByUserId(userId);
    if (account !== null) {
        const hashedPassword = account.password;
        if (!bcrypt.compareSync(oldPassword.toString(), hashedPassword))
            return res.status(400).json({
                isSuccess: false,
                message: "Old password is incorrect!"
            });

        const newHashedPassword = await bcrypt.hash(newPassword.toString(), salt);
        await userAccountModel.updatePassword(userId, newHashedPassword);

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

// Validate email and send OTP code API
router.post('/password/otp', async function(req, res) {
    const email = req.body.email || '';
    const user = await userModel.findByEmail(email.toString());

    if (user !== null) {
        const otp = createOTP();
        const VERIFY_EMAIL_SUBJECT = 'Solar Banking: Please verify your email address';
        const OTP_MESSAGE = `
            Dear ${user.full_name},\n
            Here is the OTP code you need to reset password: ${otp}.\n
            This code will be expired 5 minutes after this email was sent. If you did not make this request, you can ignore this email.   
        `;
        const newForgetPassword = {
            user_id: user.user_id,
            reset_at: moment().add(process.env.otp_time, 's').toDate(),
            otp_code: otp,
            old_password: '',
            new_password: ''
        }

        sendEmail(email, VERIFY_EMAIL_SUBJECT, OTP_MESSAGE);
        await forgetPasswordHistoryModel.genericMethods.add(newForgetPassword);

        return res.json({
            isSuccess: true,
            user_id: user.user_id,
            message: "OTP code was sent. Please check your email and verify!"
        });
    }
    else
        return res.status(400).json({
            isSuccess: false,
            message: "Email does not exist in the system!"
        });
});

// Validate OTP code API
router.post('/password/validation/otp', async function(req, res) {
    const otp = req.body.otp || '';
    const userId = req.body.user_id || 0;

    const lastForgetPassword = await forgetPasswordHistoryModel.findLastChangeById(userId);
    if (lastForgetPassword !== null) {
        if (otp === lastForgetPassword.otp_code && moment().isBefore(lastForgetPassword.reset_at))
            return res.json({
                isSuccess: true,
                message: 'Validation successfully',
                reset_password_token: await bcrypt.hash(otp + lastForgetPassword.reset_at, salt),
                user_id: userId
            });
        else
            return res.status(400).json({
                isSuccess: false,
                message: 'Validation failed. OTP code may be incorrect or the session was expired!'
            });
    }
    else
        return res.status(400).json({
            isSuccess: false,
            message: 'Validation failed. Do not have any otp records for this user!'
        });
});

// Reset password API
router.post('/password', async function(req, res) {
    const password = req.body.password || '';
    const token = req.body.reset_password_token || '';
    const userId = req.body.user_id || 0;

    const lastForgetPassword = await forgetPasswordHistoryModel.findLastChangeById(userId);
    if (lastForgetPassword !== null) {
        const otp = lastForgetPassword.otp_code;
        if (!bcrypt.compareSync(otp + lastForgetPassword.reset_at, token.toString()))
            return res.status(400).json({
                isSuccess: false,
                message: 'Reset failed. This user do not have permission to reset password!'
            });

        const hashedPassword = await bcrypt.hash(password, salt);
        const account = await userAccountModel.findByUserId(userId);
        const newForgetPassword = {
            user_id: userId,
            reset_at: moment().toDate(),
            otp_code: lastForgetPassword.otp_code,
            old_password: account.password,
            new_password: hashedPassword
        }

        await userAccountModel.updatePassword(account.username, hashedPassword);
        await forgetPasswordHistoryModel.updateLastChange(userId, lastForgetPassword.reset_at, newForgetPassword);

        return res.json({
            isSuccess: true,
            message: 'Reset successfully. Please back to login screen and sign up!'
        });
    }
    else
        return res.status(400).json({
            isSuccess: false,
            message: 'Reset failed. Do not have any otp records for this user!'
        });
});

export default router;