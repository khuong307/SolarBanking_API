/**
 * @swagger
 * tags:
 *   name: User Account
 *   description: API to handle common features such as login, change password, reset password.
 * components:
 *   schemas:
 *     UserAccount:
 *       type: object
 *       required:
 *         - username
 *         - password
 *       properties:
 *         username:
 *           type: string
 *           description: The login name.
 *         password:
 *           type: string
 *           description: The login password.
 *         user_type_id:
 *           type: integer
 *           description: The type of user.
 *         refresh_token:
 *           type: string
 *           description: A string is used to refresh access token if expired.
 *       example:
 *          username: ddk992001
 *          password: "12345"
 *          user_type_id: 1
 *          refresh_token: An21ahmvajg89822hbnhba
 */

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

/**
 * @swagger
 * /accounts/authentication:
 *   post:
 *     summary: Login to application
 *     tags: [User Account]
 *     requestBody:
 *       description: Account info
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserAccount'
 *           example:
 *             username: ddk992001
 *             password: "12345"
 *     responses:
 *       "200":
 *         description: Login successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isSuccess:
 *                   type: boolean
 *                   description: The login status.
 *                 message:
 *                   type: string
 *                   description: The login message.
 *                 accessToken:
 *                   type: string
 *                   description: A string is used to access authentication features.
 *                 refreshToken:
 *                   type: string
 *                   description: A string is used to refresh access token if expired.
 *                 account:
 *                   type: object
 *                   properties:
 *                     user_id:
 *                       type: integer
 *                       description: The login user id.
 *                     username:
 *                       type: string
 *                       description: The login username.
 *                     role:
 *                       type: string
 *                       description: The login user role.
 *             example:
 *               isSuccess: true
 *               message: Login successfully!
 *               accessToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXlsb2FkIjoibnNuaGFuIiwiaWF0IjoxNjcyNTU5NTUxLCJleHAiOjE2NzI1NjAxNTF9.9dtX_GD4xQxuJ59Rw7fQFKds4fTJe0bSr4LcjHYyDvw
 *               refreshToken: An21ahmvajg89822hbnhba
 *               account:
 *                 user_id: 1
 *                 username: ddk992001
 *                 role: Customer
 *       "400":
 *         description: Login failed.
 *         content:
 *           application/json:
 *             examples:
 *               Invalid schema:
 *                 value:
 *                 - instancePath: /password
 *                   schemaPath: "#/properties/last_name/password"
 *                   keyword: type
 *                   params:
 *                     type: string
 *                   message: must be string
 *               Wrong username or password:
 *                 value:
 *                   isSuccess: false
 *                   message: Username or password is incorrect!
 */
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
        const userType = await userTypeModel.genericMethods.findById(account.user_type_id);

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

    return res.status(400).json({
        isSuccess: false,
        message: "Username or password is incorrect!"
    });
});

/**
 * @swagger
 * /accounts/{userId}/password:
 *   put:
 *     summary: Change password
 *     tags: [User Account]
 *     parameters:
 *     - name: userId
 *       in: path
 *       description: User id to change password
 *       required: true
 *       schema:
 *         type: integer
 *     - name: access_token
 *       in: header
 *       description: A string is used to access authentication features
 *       schema:
 *         type: string
 *     - name: refresh_token
 *       in: header
 *       description: A string is used to refresh access token if expired
 *       schema:
 *         type: string
 *     requestBody:
 *       description: Password info
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               old_password:
 *                 type: string
 *                 description: The current password.
 *               new_password:
 *                 type: string
 *                 description: The change password.
 *           example:
 *             old_password: "12345"
 *             new_password: "123456"
 *     responses:
 *       "200":
 *         description: Successful operation.
 *         content:
 *           application/json:
 *             examples:
 *               Change successfully:
 *                 value:
 *                   isSuccess: true
 *                   message: Change password successfully!
 *               Get new access token:
 *                 value:
 *                   accessToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXlsb2FkIjoibnNuaGFuIiwiaWF0IjoxNjcyNTU5NTUxLCJleHAiOjE2NzI1NjAxNTF9.9dtX_GD4xQxuJ59Rw7fQFKds4fTJe0bSr4LcjHYyDvw
 *       "400":
 *         description: Change failed.
 *         content:
 *           application/json:
 *             examples:
 *               Invalid parameter:
 *                 value:
 *                   error: 'The id parameter must be a positive integer'
 *               Not existed id:
 *                 value:
 *                   isSuccess: false
 *                   message: Wrong username!
 *               Wrong password:
 *                 value:
 *                   isSuccess: false
 *                   message: Old password is incorrect!
 *       "401":
 *          description: Unauthorized user
 *          content:
 *            application/json:
 *              example:
 *                message: Unauthorized user!
 */
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

    return res.status(400).json({
        isSuccess: false,
        message: "Wrong username!"
    });
});

/**
 * @swagger
 * /accounts/password/otp:
 *   post:
 *     summary: Validate email to send reset password OTP
 *     tags: [User Account]
 *     requestBody:
 *       description: Email info
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: The user mail.
 *           example:
 *             email: "ddk992001@gmail.com"
 *     responses:
 *       "200":
 *         description: Validate successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isSuccess:
 *                   type: boolean
 *                   description: The validation status.
 *                 user_id:
 *                   type: integer
 *                   description: The id of validated user.
 *                 message:
 *                   type: string
 *                   description: The message validation.
 *             example:
 *               isSuccess: true
 *               user_id: 1
 *               message: OTP Code was sent. Please check your email and verify!
 *       "400":
 *         description: Validate failed.
 *         content:
 *           application/json:
 *             example:
 *               isSuccess: false
 *               message: Email does not exist in the system!
 */
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

    return res.status(400).json({
        isSuccess: false,
        message: "Email does not exist in the system!"
    });
});

/**
 * @swagger
 * /accounts/password/validation/otp:
 *   post:
 *     summary: Verify reset password OTP
 *     tags: [User Account]
 *     requestBody:
 *       description: OTP info
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               otp:
 *                 type: string
 *                 description: The OTP is sent to email.
 *               user_id:
 *                 type: integer
 *                 description: The id of user needs to reset password.
 *           example:
 *             otp: "106352"
 *             user_id: 1
 *     responses:
 *       "200":
 *         description: Verify successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isSuccess:
 *                   type: boolean
 *                   description: The verification status
 *                 user_id:
 *                   type: integer
 *                   description: The id of verified user
 *                 message:
 *                   type: string
 *                   description: The message verification
 *                 reset_password_token:
 *                   type: string
 *                   description: The token needs to reset password
 *             example:
 *               isSuccess: true
 *               user_id: 1
 *               message: Validation successfully!
 *               reset_password_token: $2b$10$7.XeJcEbRScKCEcytrkIVuc.VwCgKsVpObi5jTK52hNVSDPXvD5r.
 *       "400":
 *         description: Verify failed.
 *         content:
 *           application/json:
 *             examples:
 *               Wrong OTP:
 *                 value:
 *                   isSuccess: false
 *                   message: Validation failed. OTP code may be incorrect or the session was expired!
 *               Do not have records:
 *                 value:
 *                   isSuccess: false
 *                   message: Validation failed. Do not have any otp records for this user!
 */
router.post('/password/validation/otp', async function(req, res) {
    const otp = req.body.otp || '';
    const userId = req.body.user_id || 0;

    const lastForgetPassword = await forgetPasswordHistoryModel.findLastChangeById(userId);
    if (lastForgetPassword !== null) {
        if (otp === lastForgetPassword.otp_code && moment().isBefore(lastForgetPassword.reset_at))
            return res.json({
                isSuccess: true,
                message: 'Validation successfully!',
                reset_password_token: await bcrypt.hash(otp + lastForgetPassword.reset_at, salt),
                user_id: userId
            });

        return res.status(400).json({
            isSuccess: false,
            message: 'Validation failed. OTP code may be incorrect or the session was expired!'
        });
    }

    return res.status(400).json({
        isSuccess: false,
        message: 'Validation failed. Do not have any otp records for this user!'
    });
});

/**
 * @swagger
 * /accounts/password:
 *   post:
 *     summary: Reset password OTP
 *     tags: [User Account]
 *     requestBody:
 *       description: Password info
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *                 description: The new password.
 *               reset_password_token:
 *                 type: string
 *                 description: A string is used to determine if user verifies OTP code.
 *               user_id:
 *                 type: integer
 *                 description: The id of user needs to reset password
 *           example:
 *             password: "123456"
 *             reset_password_token: $2b$10$7.XeJcEbRScKCEcytrkIVuc.VwCgKsVpObi5jTK52hNVSDPXvD5r.
 *             user_id: 1
 *     responses:
 *       "200":
 *         description: Reset successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isSuccess:
 *                   type: boolean
 *                   description: The reset status
 *                 message:
 *                   type: string
 *                   description: The message reset
 *             example:
 *               isSuccess: true
 *               message: Reset successfully. Please back to login screen and sign up!
 *       "400":
 *         description: Reset failed.
 *         content:
 *           application/json:
 *             examples:
 *               Wrong token:
 *                 value:
 *                   isSuccess: false
 *                   message: Reset failed. This user do not have permission to reset password!
 *               Do not have records:
 *                 value:
 *                   isSuccess: false
 *                   message: Reset failed. Do not have any otp records for this user!
 */
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
        console.log(hashedPassword);
        const account = await userAccountModel.findByUserId(userId);
        const newForgetPassword = {
            user_id: userId,
            reset_at: moment().toDate(),
            otp_code: lastForgetPassword.otp_code,
            old_password: account.password,
            new_password: hashedPassword
        }

        await userAccountModel.updatePassword(userId, hashedPassword);
        await forgetPasswordHistoryModel.updateLastChange(userId, lastForgetPassword.reset_at, newForgetPassword);

        return res.json({
            isSuccess: true,
            message: 'Reset successfully. Please back to login screen and sign up!'
        });
    }

    return res.status(400).json({
        isSuccess: false,
        message: 'Reset failed. Do not have any otp records for this user!'
    });
});

export default router;