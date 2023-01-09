/**
 * @swagger
 * tags:
 *   name: User
 *   description: API to handle features and information belonging to user.
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         user_id:
 *           type: integer
 *           description: The id of user.
 *         full_name:
 *           type: string
 *           description: The full name of user.
 *         email:
 *           type: integer
 *           description: The email of user.
 *         phone:
 *           type: string
 *           description: The phone number of user.
 *       example:
 *          user_id: 1
 *          full_name: "Dang Duy Khang"
 *          email: ddk992001@gmail.com
 *          phone: "0763937086"
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       properties:
 *         notification_id:
 *           type: integer
 *           description: The id of notification.
 *         user_id:
 *           type: integer
 *           description: The id of user in notification.
 *         transaction_id:
 *           type: integer
 *           description: The id of transaction in notification.
 *         debt_id:
 *           type: integer
 *           description: The id of debt in notification.
 *         notification_message:
 *           type: string
 *           description: The message in notification
 *         is_seen:
 *           type: boolean
 *           description: The value to determine if the notification is seen
 *         notification_created_at:
 *           type: string
 *           format: date-time
 *           description: The time of notification is created
 *         notification_title:
 *           type: string
 *           description: The title of notification
 *       example:
 *          notification_id: 1
 *          user_id: 1
 *          transaction_id: 2
 *          debt_id: 4
 *          notification_message: User ddkhang paid debt.
 *          is_seen: 0
 *          notification_created_at: 2023-01-05 10:00:00
 *          notification_title: Debt Payment
 */

import express from 'express';
import { readFile } from 'fs/promises';
import * as dotenv from 'dotenv';

import {authRole, authUser} from '../middlewares/auth.mdw.js';
import role from '../utils/role.js';
import validate, {validateParams} from '../middlewares/validate.mdw.js';
import bankingAccountModel from '../models/banking-account.model.js';
import userModel from '../models/user.model.js';
import recipientModel from '../models/recipient.model.js';
import bankModel from "../models/bank.model.js";
import userAccountModel from "../models/user-account.model.js";
import banking_accountModel from "../models/banking-account.model.js";
import transactionModel from "../models/transaction.model.js";
import {filterTransactionByTypeAndDes} from "../utils/bank.js";
import notificationModel from "../models/notification.model.js";
import axios from "axios";
import {BANK_CODE} from "../utils/bank_constanst.js";
import md5 from "md5";

dotenv.config();

const userSchema = JSON.parse(await readFile(new URL('../schemas/user.json', import.meta.url)));
const recipientSchema = JSON.parse(await readFile(new URL('../schemas/recipient.json', import.meta.url)));

const router = express.Router();

/**
 * @swagger
 * /users/{userId}/accounts:
 *   get:
 *     summary: Get all banking accounts
 *     tags: [User]
 *     parameters:
 *     - name: userId
 *       in: path
 *       description: User id to get banking accounts
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
 *     responses:
 *       "200":
 *         description: Successful operation.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/BankingAccount"
 *             examples:
 *               Get successfully:
 *                 value:
 *                   - account_number: "11111"
 *                     balance: 50000000
 *                     user_id: 1
 *                     bank_code: "SLB"
 *                     is_spend_account: 1
 *                   - account_number: "23651"
 *                     balance: 2000000
 *                     user_id: 1
 *                     bank_code: "SLB"
 *                     is_spend_account: 0
 *               Get new access token:
 *                 value:
 *                   accessToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXlsb2FkIjoibnNuaGFuIiwiaWF0IjoxNjcyNTU5NTUxLCJleHAiOjE2NzI1NjAxNTF9.9dtX_GD4xQxuJ59Rw7fQFKds4fTJe0bSr4LcjHYyDvw
 *       "400":
 *         description: Get failed.
 *         content:
 *           application/json:
 *             example:
 *               error: 'The id parameter must be a positive integer'
 *       "401":
 *         description: Unauthorized user
 *         content:
 *           application/json:
 *             example:
 *               message: Unauthorized user!
 *       "403":
 *         description: User must be customer
 *         content:
 *           application/json:
 *             example:
 *               message: Not allowed user!
 */
router.get('/:userId/accounts', validateParams, authUser, authRole(role.CUSTOMER), async function(req, res) {
    const userId = +req.params.userId;
    const accounts = await bankingAccountModel.findByUserId(userId);

    return res.json(accounts);
});

/**
 * @swagger
 * /users/{userId}/savingAccounts:
 *   get:
 *     summary: Get all saving accounts
 *     tags: [User]
 *     parameters:
 *     - name: userId
 *       in: path
 *       description: User id to get saving accounts
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
 *     responses:
 *       "200":
 *         description: Successful operation.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/BankingAccount"
 *             examples:
 *               Get successfully:
 *                 value:
 *                   - account_number: "11111"
 *                     balance: 50000000
 *                     user_id: 1
 *                     bank_code: "SLB"
 *                     is_spend_account: 0
 *                   - account_number: "23651"
 *                     balance: 2000000
 *                     user_id: 1
 *                     bank_code: "SLB"
 *                     is_spend_account: 0
 *               Get new access token:
 *                 value:
 *                   accessToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXlsb2FkIjoibnNuaGFuIiwiaWF0IjoxNjcyNTU5NTUxLCJleHAiOjE2NzI1NjAxNTF9.9dtX_GD4xQxuJ59Rw7fQFKds4fTJe0bSr4LcjHYyDvw
 *       "400":
 *         description: Get failed.
 *         content:
 *           application/json:
 *             example:
 *               error: 'The id parameter must be a positive integer'
 *       "401":
 *         description: Unauthorized user
 *         content:
 *           application/json:
 *             example:
 *               message: Unauthorized user!
 *       "403":
 *         description: User must be customer
 *         content:
 *           application/json:
 *             example:
 *               message: Not allowed user!
 */
router.get('/:userId/savingAccounts', validateParams, authUser, authRole(role.CUSTOMER), async function(req, res) {
    const userId = +req.params.userId;
    const SAVING_ACCOUNT_TYPE = 0;
    const accounts = await bankingAccountModel.findByUserIdAndAccountType(userId, SAVING_ACCOUNT_TYPE);

    return res.json(accounts);
});

/**
 * @swagger
 * /users/{userId}/spendAccounts:
 *   get:
 *     summary: Get all spending accounts
 *     tags: [User]
 *     parameters:
 *     - name: userId
 *       in: path
 *       description: User id to get spending accounts
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
 *     responses:
 *       "200":
 *         description: Successful operation.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/BankingAccount"
 *             examples:
 *               Get successfully:
 *                 value:
 *                   - account_number: "11111"
 *                     balance: 50000000
 *                     user_id: 1
 *                     bank_code: "SLB"
 *                     is_spend_account: 1
 *               Get new access token:
 *                 value:
 *                   accessToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXlsb2FkIjoibnNuaGFuIiwiaWF0IjoxNjcyNTU5NTUxLCJleHAiOjE2NzI1NjAxNTF9.9dtX_GD4xQxuJ59Rw7fQFKds4fTJe0bSr4LcjHYyDvw
 *       "400":
 *         description: Get failed.
 *         content:
 *           application/json:
 *             example:
 *               error: 'The id parameter must be a positive integer'
 *       "401":
 *         description: Unauthorized user
 *         content:
 *           application/json:
 *             example:
 *               message: Unauthorized user!
 *       "403":
 *         description: User must be customer
 *         content:
 *           application/json:
 *             example:
 *               message: Not allowed user!
 */
router.get('/:userId/spendAccounts', validateParams, authUser, authRole(role.CUSTOMER), async function(req, res) {
    const userId = +req.params.userId;
    const SPENDING_ACCOUNT_TYPE = 1;
    let accounts = await bankingAccountModel.findByUserIdAndAccountType(userId, SPENDING_ACCOUNT_TYPE);

    if (accounts.length === 0)
        accounts = await bankingAccountModel.findByUserIdAndAccountType(userId, -1);

    return res.json(accounts);
});

/**
 * @swagger
 * /users/{userId}:
 *   get:
 *     summary: Get user info
 *     tags: [User]
 *     parameters:
 *     - name: userId
 *       in: path
 *       description: User id to get info
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
 *     responses:
 *       "200":
 *         description: Successful operation.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/User"
 *             examples:
 *               Get successfully:
 *                 value:
 *                    user_id: 1
 *                    full_name: "Dang Duy Khang"
 *                    email: ddk992001@gmail.com
 *                    phone: "0763937086"
 *               Get new access token:
 *                 value:
 *                   accessToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXlsb2FkIjoibnNuaGFuIiwiaWF0IjoxNjcyNTU5NTUxLCJleHAiOjE2NzI1NjAxNTF9.9dtX_GD4xQxuJ59Rw7fQFKds4fTJe0bSr4LcjHYyDvw
 *       "400":
 *         description: Get failed.
 *         content:
 *           application/json:
 *             example:
 *               error: 'The id parameter must be a positive integer'
 *       "401":
 *         description: Unauthorized user
 *         content:
 *           application/json:
 *             example:
 *               message: Unauthorized user!
 */
router.get('/:userId', validateParams, authUser, async function(req, res) {
    const userId = +req.params.userId;
    const user = await userModel.genericMethods.findById(userId);

    return res.json(user);
});

/**
 * @swagger
 * /users/{userId}:
 *   put:
 *     summary: Update user info
 *     tags: [User]
 *     parameters:
 *     - name: userId
 *       in: path
 *       description: User id to update info
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
 *       description: User info
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/User"
 *           example:
 *             full_name: "Dang Duy Khang"
 *             email: ddk9920011@gmail.com
 *             phone: "0123456789"
 *     responses:
 *       "200":
 *         description: Successful operation.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/User"
 *             examples:
 *               Change successfully:
 *                 value:
 *                    user_id: 1
 *                    full_name: "Dang Duy Khang"
 *                    email: ddk9920011@gmail.com
 *                    phone: "0123456789"
 *               Get new access token:
 *                 value:
 *                   accessToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXlsb2FkIjoibnNuaGFuIiwiaWF0IjoxNjcyNTU5NTUxLCJleHAiOjE2NzI1NjAxNTF9.9dtX_GD4xQxuJ59Rw7fQFKds4fTJe0bSr4LcjHYyDvw
 *       "400":
 *         description: Get failed.
 *         content:
 *           application/json:
 *             examples:
 *               Invalid schema:
 *                 value:
 *                 - instancePath: /email
 *                   schemaPath: "#/properties/email"
 *                   keyword: type
 *                   params:
 *                     type: string
 *                   message: must be string
 *               Empty body:
 *                 value:
 *                   message: The request body must not be empty
 *               Invalid parameter:
 *                 value:
 *                   error: The id parameter must be a positive integer
 *       "401":
 *         description: Unauthorized user
 *         content:
 *           application/json:
 *             example:
 *               message: Unauthorized user!
 *       "403":
 *         description: User must be customer
 *         content:
 *           application/json:
 *             example:
 *               message: Not allowed user!
 */
router.put('/:userId', validateParams, validate(userSchema), authUser, authRole(role.CUSTOMER), async function(req, res) {
    const userId = +req.params.userId;
    const updatedInfo = req.body;

    if (updatedInfo && Object.keys(updatedInfo).length === 0 && Object.getPrototypeOf(updatedInfo) === Object.prototype)
        return res.status(400).json({
            message: 'The request body must not be empty'
        });

    await userModel.genericMethods.update(userId, updatedInfo);
    const user = await userModel.genericMethods.findById(userId);

    return res.json(user);
});

/**
 * @swagger
 * /users/{userId}/recipients:
 *   get:
 *     summary: Get recipient list
 *     tags: [User]
 *     parameters:
 *     - name: userId
 *       in: path
 *       description: User id to get recipients
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
 *     responses:
 *       "200":
 *         description: Successful operation.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user_id:
 *                   type: integer
 *                   description: The id of user to get recipients
 *                 owner_id:
 *                   type: integer
 *                   description: The id of user in recipient list
 *                 account_number:
 *                   type: string
 *                   description: The banking account of user in recipient list
 *                 nick_name:
 *                   type: string
 *                   description: The nickname of user in recipient list
 *                 bank_name:
 *                   type: string
 *                   description: The bank of user in recipient list
 *                 bank_code:
 *                   type: string
 *                   description: The bank code of recipient bank
 *             examples:
 *               Get successfully:
 *                 value:
 *                    user_id: 1
 *                    owner_id: 3
 *                    account_number: "111111"
 *                    nick_name: ddkhang
 *                    bank_name: Solar Bank
 *                    bank_code: SLB
 *               Get new access token:
 *                 value:
 *                   accessToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXlsb2FkIjoibnNuaGFuIiwiaWF0IjoxNjcyNTU5NTUxLCJleHAiOjE2NzI1NjAxNTF9.9dtX_GD4xQxuJ59Rw7fQFKds4fTJe0bSr4LcjHYyDvw
 *       "400":
 *         description: Get failed.
 *         content:
 *           application/json:
 *             example:
 *               error: The id parameter must be a positive integer
 *       "401":
 *         description: Unauthorized user
 *         content:
 *           application/json:
 *             example:
 *               message: Unauthorized user!
 *       "403":
 *         description: User must be customer
 *         content:
 *           application/json:
 *             example:
 *               message: Not allowed user!
 */
router.get('/:userId/recipients',validateParams, authUser, authRole(role.CUSTOMER), async function(req, res) {
    const userId = +req.params.userId;
    const recipients = await recipientModel.findByUserId(userId);

    for (let i = 0; i < recipients.length; i++) {
        const accountOwner = await bankingAccountModel.genericMethods.findById(recipients[i].account_number);
        let connectedBank = 'Solar Banking';

        if (accountOwner.bank_code !== null) {
            const bank = await bankModel.genericMethods.findById(accountOwner.bank_code);
            connectedBank = bank.bank_name;
        }

        recipients[i].owner_id = accountOwner.user_id;
        recipients[i].bank_name = connectedBank;
        recipients[i].bank_code = accountOwner.bank_code;
    }
    return res.json(recipients);
    
});

/**
 * @swagger
 * /users/{userId}/recipients:
 *   post:
 *     summary: Add a new recipient
 *     tags: [User]
 *     parameters:
 *     - name: userId
 *       in: path
 *       description: User id to add new recipient
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
 *       description: Recipient info
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *             -  account_number
 *             description:
 *               account_number:
 *                 type: string
 *                 description: The account number of recipient
 *               bank_code:
 *                 type: string
 *                 description: The code of bank's recipient (do not pass if add intra-bank)
 *               nick_name:
 *                 type: string
 *                 description: The nickname of recipient
 *           example:
 *             account_number: "11111"
 *             bank_code: "TXB"
 *             nick_name: "khang"
 *     responses:
 *       "200":
 *         description: Get new access token.
 *         content:
 *           application/json:
 *             example:
 *               accessToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXlsb2FkIjoibnNuaGFuIiwiaWF0IjoxNjcyNTU5NTUxLCJleHAiOjE2NzI1NjAxNTF9.9dtX_GD4xQxuJ59Rw7fQFKds4fTJe0bSr4LcjHYyDvw
 *       "201":
 *         description: Add successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               description:
 *                 isSuccess:
 *                   type: boolean
 *                   description: The add status
 *                 message:
 *                   type: string
 *                   description: The add message
 *                 recipient:
 *                   type: object
 *                   description:
 *                     user_id:
 *                       type: integer
 *                       description: The id of user owns the recipient list
 *                     account_number:
 *                       type: string
 *                       description: The account number added to list
 *                     nick_name:
 *                       type: string
 *                       description: The nickname of account added to list
 *             example:
 *               isSucess: true
 *               message: Add recipient successfully!
 *               recipient:
 *                 user_id: 1
 *                 account_number: "11111"
 *                 nick_name: khang
 *       "400":
 *         description: Get failed.
 *         content:
 *           application/json:
 *             examples:
 *               Invalid schema:
 *                 value:
 *                 - instancePath: /account_number
 *                   schemaPath: "#/properties/account_number"
 *                   keyword: type
 *                   params:
 *                     type: string
 *                   message: must be string
 *               Existed recipient:
 *                 value:
 *                   isSuccess: false
 *                   message: The account number existed in the recipient list!
 *               Add your account:
 *                 value:
 *                   isSuccess: false
 *                   message: Can not add your account number to recipient list!
 *               Add saving account:
 *                 value:
 *                   isSuccess: false
 *                   message: The account number must not be saving account!
 *               Wrong account number:
 *                 value:
 *                   isSuccess: false
 *                   message: The account number does not exist in the banking system. Please check again!
 *               Wrong connected bank:
 *                 value:
 *                   isSuccess: false
 *                   message: Bank doesn't belong to system connectivity banks!
 *               Invalid parameter:
 *                 value:
 *                   error: The id parameter must be a positive integer
 *       "401":
 *         description: Unauthorized user
 *         content:
 *           application/json:
 *             example:
 *               message: Unauthorized user!
 *       "403":
 *         description: User must be customer
 *         content:
 *           application/json:
 *             example:
 *               message: Not allowed user!
 */
router.post('/:userId/recipients', validateParams, validate(recipientSchema), authUser, authRole(role.CUSTOMER), async function(req, res) {
    const userId = +req.params.userId;
    const accountNumber = req.body.account_number;
    const bankCode = req.body.bank_code || null;
    let nickname = req.body.nick_name || null;

    const bankingAccount = await bankingAccountModel.genericMethods.findById(accountNumber);
    const existingRecipient = await recipientModel.findByUserIdAndAccountNumber(userId, accountNumber);

    if (existingRecipient.length > 0)
        return res.status(400).json({
            isSuccess: false,
            message: 'The account number existed in the recipient list!'
        });

    if (bankCode !== null) {
        const connectedBank = await bankModel.genericMethods.findById(bankCode);
        if (connectedBank !== null) {
            const recipient = {
                user_id: userId,
                account_number: accountNumber,
                nick_name: nickname
            };
            const interBankingAccount = await bankingAccountModel.genericMethods.findById(accountNumber);

            if (interBankingAccount === null) {
                const newBankingAccount = {
                    account_number: accountNumber,
                    balance: 0,
                    user_id: null,
                    bank_code: bankCode,
                    is_spend_account: 1
                }
                await bankingAccountModel.genericMethods.add(newBankingAccount);
            }

            await recipientModel.genericMethods.add(recipient);

            return res.status(201).json({
                isSuccess: true,
                message: 'Add recipient successfully!',
                recipient
            });
        }
        else
            return res.status(400).json({
                isSuccess: false,
                message: "Bank doesn't belong to system connectivity banks!"
            });
    }
    else {
        if (bankingAccount !== null) {
            if (bankingAccount.user_id === userId)
                return res.status(400).json({
                    isSuccess: false,
                    message: 'Can not add your account number to recipient list!'
                });

            if (bankingAccount.is_spend_account === 0)
                return res.status(400).json({
                    isSuccess: false,
                    message: 'The account number must not be saving account!'
                });

            if (nickname === null) {
                const owner = await userModel.genericMethods.findById(bankingAccount.user_id);
                nickname = owner.full_name;
            }

            const recipient = {
                user_id: userId,
                account_number: accountNumber,
                nick_name: nickname
            };

            await recipientModel.genericMethods.add(recipient);

            return res.status(201).json({
                isSuccess: true,
                message: 'Add recipient successfully!',
                recipient
            });
        }

        return res.status(400).json({
            isSuccess: false,
            message: 'The account number does not exist in the banking system. Please check again!'
        });
    }
});

/**
 * @swagger
 * /users/{userId}/recipients/{accountNumber}:
 *   put:
 *     summary: Update recipient info (nickname)
 *     tags: [User]
 *     parameters:
 *     - name: userId
 *       in: path
 *       description: User id to update recipient
 *       required: true
 *       schema:
 *         type: integer
 *     - name: accountNumber
 *       in: path
 *       description: Account number to update info
 *       required: true
 *       schema:
 *         type: string
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
 *       description: User info
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nick_name:
 *                 type: string
 *                 description: The new nickname of recipient
 *           example:
 *             nick_name: khang9901
 *     responses:
 *       "200":
 *         description: Successful operation.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 account_number:
 *                   type: string
 *                   description: The account number of recipient
 *                 nick_name:
 *                   type: string
 *                   description: The new nickname of recipient
 *             examples:
 *               Change successfully:
 *                 value:
 *                    account_number: "11111"
 *                    nick_name: khang9901
 *               Get new access token:
 *                 value:
 *                   accessToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXlsb2FkIjoibnNuaGFuIiwiaWF0IjoxNjcyNTU5NTUxLCJleHAiOjE2NzI1NjAxNTF9.9dtX_GD4xQxuJ59Rw7fQFKds4fTJe0bSr4LcjHYyDvw
 *       "400":
 *         description: Change failed.
 *         content:
 *           application/json:
 *             examples:
 *               Empty body:
 *                 value:
 *                   isSuccess: false
 *                   message: The request body must not be empty!
 *               Invalid parameter:
 *                 value:
 *                   error: The id parameter must be a positive integer
 *               Wrong info:
 *                 value:
 *                   message: Account number or user id does not exist!
 *       "401":
 *         description: Unauthorized user
 *         content:
 *           application/json:
 *             example:
 *               message: Unauthorized user!
 *       "403":
 *         description: User must be customer
 *         content:
 *           application/json:
 *             example:
 *               message: Not allowed user!
 */
router.put('/:userId/recipients/:accountNumber', validateParams, authUser, authRole(role.CUSTOMER), async function(req, res) {
    const userId = +req.params.userId;
    const accountNumber = req.params.accountNumber;
    const nickname = req.body.nick_name || null;

    if (nickname === null)
        return res.status(400).json({
            isSuccess: false,
            message: 'The request body must not be empty!'
        });

    const result = await recipientModel.updateNickNameByUserIdAndAccountNumber(userId, accountNumber, nickname);

    if (!result)
        return res.status(400).json({
            message: 'Account number or user id does not exist!'
        });

    return res.json({ accountNumber, nick_name: nickname });
});

/**
 * @swagger
 * /users/{userId}/recipients/{accountNumber}:
 *   delete:
 *     summary: Delete a recipient
 *     tags: [User]
 *     parameters:
 *     - name: userId
 *       in: path
 *       description: User id to delete recipient
 *       required: true
 *       schema:
 *         type: integer
 *     - name: accountNumber
 *       in: path
 *       description: Account number to delete
 *       required: true
 *       schema:
 *         type: string
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
 *     responses:
 *       "200":
 *         description: Successful operation.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isSuccess:
 *                   type: boolean
 *                   description: The status deletion
 *                 message:
 *                   type: string
 *                   description: The message deletion
 *             examples:
 *               Delete successfully:
 *                 value:
 *                    isSuccess: true
 *                    message: Delete successfully!
 *               Get new access token:
 *                 value:
 *                   accessToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXlsb2FkIjoibnNuaGFuIiwiaWF0IjoxNjcyNTU5NTUxLCJleHAiOjE2NzI1NjAxNTF9.9dtX_GD4xQxuJ59Rw7fQFKds4fTJe0bSr4LcjHYyDvw
 *       "400":
 *         description: Delete failed.
 *         content:
 *           application/json:
 *             examples:
 *               Invalid parameter:
 *                 value:
 *                   error: The id parameter must be a positive integer
 *               Wrong info:
 *                 value:
 *                   isSuccess: false
 *                   message: Account number or user id does not exist!
 *       "401":
 *         description: Unauthorized user
 *         content:
 *           application/json:
 *             example:
 *               message: Unauthorized user!
 *       "403":
 *         description: User must be customer
 *         content:
 *           application/json:
 *             example:
 *               message: Not allowed user!
 */
router.delete('/:userId/recipients/:accountNumber', validateParams, authUser, authRole(role.CUSTOMER), async function(req, res) {
    const userId = +req.params.userId;
    const accountNumber = req.params.accountNumber;

    const result = await recipientModel.deleteByUserIdAndAccountNumber(userId, accountNumber);

    if (!result)
        return res.status(400).json({
            isSuccess: false,
            message: 'Account number or user id does not exist!'
        });

    return res.status(200).json({
        isSuccess: true,
        message: 'Delete successfully!'
    });
});

/**
 * @swagger
 * /users/{userId}/history:
 *   get:
 *     summary: Get transaction history (last 30 days)
 *     tags: [User]
 *     parameters:
 *     - name: userId
 *       in: path
 *       description: Customer ID to get transaction history
 *       required: true
 *       schema:
 *         type: string
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
 *     responses:
 *       "200":
 *         description: Successful operation.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isFound:
 *                   type: boolean
 *                   description: The get status
 *                 transfer_list_by_customer:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       transaction_id:
 *                         type: integer
 *                         description: The transaction id
 *                       src_account_number:
 *                         type: string
 *                         description: The account number execute transaction
 *                       des_account_number:
 *                         type: string
 *                         description: The account number receive amount from transaction
 *                       transaction_amount:
 *                         type: integer
 *                         description: The amount of transaction
 *                       transaction_message:
 *                         type: string
 *                         description: The message of transaction
 *                       pay_transaction_fee:
 *                         type: string
 *                         description: Which account number pay for tranfer fee (SRC or DES)
 *                       is_success:
 *                         type: boolean
 *                         description: The transaction status
 *                       transaction_created_at:
 *                         type: string
 *                         format: date-time
 *                         description: The created date-time transaction
 *                       transaction_type:
 *                         type: integer
 *                         description: The type of transaction (debt payment or transfer)
 *                       other_fullname:
 *                         type: string
 *                         description: The full name of received account
 *                 paid_debt_list:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                 received_debt_list:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                 charge_by_SLB:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                 received_from_others:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *             examples:
 *               Get successfully:
 *                 value:
 *                   isFound: true
 *                   transfer_list_by_customer: [{
 *                      transaction_id: 80,
 *                      src_account_number: '28069884',
 *                      des_account_number: '32709550',
 *                      transaction_amount: 30000,
 *                      transaction_message: 'Banh bao 2 trung muoi',
 *                      pay_transaction_fee: 'SRC',
 *                      is_success: 1,
 *                      transaction_created_at: 2022-12-30T07:37:57.000Z,
 *                      transaction_type: 1,
 *                      other_fullname: 'Dang Duy Khang'
 *                   }]
 *                   paid_debt_list: [{
 *                      transaction_id: 10,
 *                      src_account_number: '71873611',
 *                      des_account_number: '28069884',
 *                      transaction_amount: 20000,
 *                      transaction_message: 'bánh mì + gửi xe',
 *                      pay_transaction_fee: 'SRC',
 *                      is_success: 1,
 *                      transaction_created_at: 2023-01-03T11:22:00.000Z,
 *                      transaction_type: 1,
 *                      other_fullname: 'Nguyen Vu Duy Khuong'
 *                   }]
 *                   received_debt_list: []
 *                   charge_by_SLB: [{
 *                      transaction_id: 29,
 *                      src_account_number: 'SLB',
 *                      des_account_number: '71873611',
 *                      transaction_amount: 50000,
 *                      transaction_message: 'SLB Charge 50,000 VND at 2023-01-03T11:22:00.000Z',
 *                      pay_transaction_fee: 'SRC',
 *                      is_success: 1,
 *                      transaction_created_at: 2023-01-03T11:22:00.000Z,
 *                      transaction_type: 1,
 *                      other_fullname: 'Nguyen Vu Duy Khuong'
 *                   }]
 *                   received_from_others: [{
 *                      transaction_id: 29,
 *                      src_account_number: '23434009',
 *                      des_account_number: '71873611',
 *                      transaction_amount: 100000,
 *                      transaction_message: 'Hung gui Ngoc tien an sang nhe',
 *                      pay_transaction_fee: 'SRC',
 *                      is_success: 1,
 *                      transaction_created_at: 2023-01-06T11:22:00.000Z,
 *                      transaction_type: 1,
 *                      other_fullname: 'Nguyen An Hung'
 *                   }]
 *               Get new access token:
 *                 value:
 *                   accessToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXlsb2FkIjoibnNuaGFuIiwiaWF0IjoxNjcyNTU5NTUxLCJleHAiOjE2NzI1NjAxNTF9.9dtX_GD4xQxuJ59Rw7fQFKds4fTJe0bSr4LcjHYyDvw
 *       "209":
 *         description: Wrong information of customer.
 *         content:
 *           application/json:
 *             example:
 *               message: 'Not found this customer base on account number or username!'
 *       "401":
 *         description: Unauthorized user
 *         content:
 *           application/json:
 *             example:
 *               message: Unauthorized user!
 *       "403":
 *         description: User must be employee
 *         content:
 *           application/json:
 *             example:
 *               message: Not allowed user!
 *       "409":
 *         description: User ID not found!
 *         content:
 *           application/json:
 *             example:
 *               message: User not found!
 *       "500":
 *         description: Server Internal Error
 *         content:
 *           application/json:
 *             example:
 *               message: Server Internal Error
 */
router.get('/:userId/history', validateParams, authUser, authRole(role.CUSTOMER), async function(req, res) {
    const userId = +req.params.userId;
    const userAccounts =   await banking_accountModel.genericMethods.findByColMany("user_id", userId)
    var userInfo = ""
    for (const c of userAccounts){
        if (c.is_spend_account == 1){
            userInfo = c
        }
    }
    console.log(userInfo)
    if (userInfo == null){
        return res.status(209).json({
            isFound: false,
            message: "User ID is invalid!"
        })
    }
    else{
        const now = new Date()
        now.setHours(now.getHours() + 7) // UTC 7.
        const days30 = new Date()
        days30.setDate(now.getDate() - 30)

        const accessInfo = userInfo.account_number
        const chargeData = await transactionModel.genericMethods.findBy2ColMany("des_account_number", accessInfo, "src_account_number", "SLB")
        const all_transaction = await transactionModel.genericMethods.findByColManyWithDate("src_account_number", accessInfo, days30, now)
        const transfer_list_by_customer = await filterTransactionByTypeAndDes(all_transaction, 1, 1,false)
        const charge_by_SLB = await filterTransactionByTypeAndDes(chargeData, 1, 1, true)
        const paid_debt_list  = await filterTransactionByTypeAndDes(all_transaction, 2, 1, false)

        const received_list = await transactionModel.genericMethods.findByColMany("des_account_number", accessInfo)
        const received_from_others = await filterTransactionByTypeAndDes(received_list, 1, 2, false)
        const recevied_debt_list = await filterTransactionByTypeAndDes(received_list, 2, 2, false)

        return res.status(200).json({
            isFound: true,
            transfer_list_by_customer,
            paid_debt_list,
            recevied_debt_list,
            charge_by_SLB,
            received_from_others,
        })
    }

});

/**
 * @swagger
 * /users/{userId}/notifications:
 *   get:
 *     summary: Get notification list
 *     tags: [User]
 *     parameters:
 *     - name: userId
 *       in: path
 *       description: User id to get notifications
 *       required: true
 *       schema:
 *         type: integer
 *     - name: limit
 *       in: query
 *       description: The return length of notification (if user doesn't pass value to parameter, it will return all)
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
 *     responses:
 *       "200":
 *         description: Successful operation.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Notification"
 *             examples:
 *               Get successfully:
 *                 value:
 *                   - notification_id: 1
 *                     user_id: 1
 *                     transaction_id: 2
 *                     debt_id: 4
 *                     notification_message: User ddkhang paid debt.
 *                     is_seen: 0
 *                     notification_created_at: 2023-01-05 10:00:00
 *                     notification_title: Debt Payment
 *                   - notification_id: 2
 *                     user_id: 1
 *                     transaction_id: null
 *                     debt_id: 5
 *                     notification_message: User ddkhang cancelled debt.
 *                     is_seen: 1
 *                     notification_created_at: 2023-01-05 11:00:00
 *                     notification_title: Debt Cancellation
 *               Get new access token:
 *                 value:
 *                   accessToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXlsb2FkIjoibnNuaGFuIiwiaWF0IjoxNjcyNTU5NTUxLCJleHAiOjE2NzI1NjAxNTF9.9dtX_GD4xQxuJ59Rw7fQFKds4fTJe0bSr4LcjHYyDvw
 *       "400":
 *         description: Get failed.
 *         content:
 *           application/json:
 *             example:
 *               error: The id parameter must be a positive integer
 *       "401":
 *         description: Unauthorized user
 *         content:
 *           application/json:
 *             example:
 *               message: Unauthorized user!
 *       "403":
 *         description: User must be customer
 *         content:
 *           application/json:
 *             example:
 *               message: Not allowed user!
 */
router.get('/:userId/notifications', validateParams, authUser, authRole(role.CUSTOMER), async function(req, res) {
    const MAX_NOTIFICATION_LENGTH = 1000;
    const userId = +req.params.userId;
    const limit = +req.query.limit || MAX_NOTIFICATION_LENGTH;

    const notifications = await notificationModel.getNotificationsByUserId(userId, limit);

    return res.json(notifications);
});

/**
 * @swagger
 * /users/notifications/all:
 *   put:
 *     summary: Update all notifications is seen
 *     tags: [User]
 *     parameters:
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
 *       description: Notification ids info
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               unseen_id_array:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: The id array of notification which is unseen
 *           example:
 *             unseen_id_array: [1,3,5,9]
 *     responses:
 *       "200":
 *         description: Successful operation.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isSuccess:
 *                   type: boolean
 *                   description: The update status
 *                 message:
 *                   type: string
 *                   description: The update message
 *             examples:
 *               Change successfully:
 *                 value:
 *                    isSuccess: true
 *                    message: Update is_seen successfully!
 *               Get new access token:
 *                 value:
 *                   accessToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXlsb2FkIjoibnNuaGFuIiwiaWF0IjoxNjcyNTU5NTUxLCJleHAiOjE2NzI1NjAxNTF9.9dtX_GD4xQxuJ59Rw7fQFKds4fTJe0bSr4LcjHYyDvw
 *       "400":
 *         description: Change failed.
 *         content:
 *           application/json:
 *             example:
 *               isSuccess: false
 *               message: The response body must be an integer array!
 *       "401":
 *         description: Unauthorized user
 *         content:
 *           application/json:
 *             example:
 *               message: Unauthorized user!
 *       "403":
 *         description: User must be customer
 *         content:
 *           application/json:
 *             example:
 *               message: Not allowed user!
 */
router.put('/notifications/all', authUser, authRole(role.CUSTOMER), async function(req, res) {
    const unseenIdArray = req.body.unseen_id_array || [];

    if (!Array.isArray(unseenIdArray))
        return res.status(400).json({
            isSuccess: false,
            message: 'The response body must be an integer array!'
        });

    for (let i = 0; i < unseenIdArray.length; i++) {
        await notificationModel.updateIsSeen(unseenIdArray[i]);
    }

    return res.json({
        isSuccess: true,
        message: 'Update is_seen successfully!'
    });
});

/**
 * @swagger
 * /users/notifications/{notificationId}:
 *   put:
 *     summary: Update notification is seen
 *     tags: [User]
 *     parameters:
 *     - name: notificationId
 *       in: path
 *       description: Notification id to update is seen.
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
 *     responses:
 *       "200":
 *         description: Successful operation.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isSuccess:
 *                   type: boolean
 *                   description: The update status
 *                 message:
 *                   type: string
 *                   description: The update message
 *             examples:
 *               Change successfully:
 *                 value:
 *                    isSuccess: true
 *                    message: Update is_seen successfully!
 *               Get new access token:
 *                 value:
 *                   accessToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXlsb2FkIjoibnNuaGFuIiwiaWF0IjoxNjcyNTU5NTUxLCJleHAiOjE2NzI1NjAxNTF9.9dtX_GD4xQxuJ59Rw7fQFKds4fTJe0bSr4LcjHYyDvw
 *       "400":
 *         description: Change failed.
 *         content:
 *           application/json:
 *             example:
 *               isSuccess: false
 *               message: The notification id does not exist in the system!
 *       "401":
 *         description: Unauthorized user
 *         content:
 *           application/json:
 *             example:
 *               message: Unauthorized user!
 *       "403":
 *         description: User must be customer
 *         content:
 *           application/json:
 *             example:
 *               message: Not allowed user!
 */
router.put('/notifications/:notificationId', authUser, authRole(role.CUSTOMER), async function(req, res) {
    const notificationId = +req.params.notificationId || 0;

    const ret = await notificationModel.updateIsSeen(notificationId);

    if (ret === 0)
        return res.status(400).json({
            isSuccess: false,
            message: 'The notification id does not exist in the system!'
        });

    return res.json({
        isSuccess: true,
        message: 'Update is_seen successfully!'
    });
});

/**
 * @swagger
 * /users/internal/info:
 *   get:
 *     summary: Get user info from partner bank
 *     tags: [User]
 *     parameters:
 *     - name: account_number
 *       in: query
 *       required: true
 *       description: The account number from partner
 *       schema:
 *         type: string
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
 *     responses:
 *       "200":
 *         description: Successful operation.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accountNumber:
 *                   type: string
 *                   description: The account number from partner
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       description: The id of user from partner
 *                     name:
 *                       type: string
 *                       description: The full name of user from partner
 *                     username:
 *                       type: string
 *                       description: The login name of user from partner
 *                     phone:
 *                       type: string
 *                       description: The phone number of user from partnetr
 *                 statusCode:
 *                   type: integer
 *                   description: The status code from response
 *                 message:
 *                   type: string
 *                   description: The get message
 *             examples:
 *               Get successfully:
 *                 value:
 *                   accountNumber: "59025838490"
 *                   user:
 *                     id: 1083
 *                     name: Customer name
 *                     username: usr100
 *                     phone: "0123456879"
 *                   statusCode: 200
 *                   message: Lấy thông tin tài khoản thành công.
 *               Get new access token:
 *                 value:
 *                   accessToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXlsb2FkIjoibnNuaGFuIiwiaWF0IjoxNjcyNTU5NTUxLCJleHAiOjE2NzI1NjAxNTF9.9dtX_GD4xQxuJ59Rw7fQFKds4fTJe0bSr4LcjHYyDvw
 *       "400":
 *         description: Get failed.
 *         content:
 *           application/json:
 *             example:
 *               isSuccess: false
 *               error: Get account info from connectivity bank failed!
 *       "401":
 *         description: Unauthorized user
 *         content:
 *           application/json:
 *             example:
 *               message: Unauthorized user!
 */
router.get('/internal/info', authUser, async function(req, res) {
    const accountNumber = req.query.account_number;
    const payload = {
        accountNumber,
        slug: BANK_CODE
    };
    const data = JSON.stringify(payload);
    const timestamp = Date.now();
    const msgToken = md5(timestamp + data + process.env.SECRET_KEY);
    const infoVerification = {
        accountNumber,
        timestamp,
        msgToken,
        slug: BANK_CODE
    };
    const result = await axios({
        url: "http://ec2-35-171-9-165.compute-1.amazonaws.com:3001/accounts/external/get-info",
        method: "POST",
        data: infoVerification
    });

    if (result.data.statusCode === 200) {
        return res.json(result.data.data);
    }
    else
        return res.status(400).json({
            isSuccess: false,
            message: 'Get account info from connectivity bank failed!'
        });
});

/**
 * @swagger
 * /users/{userId}/spendingAccounts/lock:
 *   post:
 *     summary: Lock spending account
 *     tags: [User]
 *     parameters:
 *     - name: userId
 *       in: path
 *       description: User id to lock account.
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
 *     responses:
 *       "200":
 *         description: Successful operation.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isSuccess:
 *                   type: boolean
 *                   description: The status lock
 *                 message:
 *                   type: string
 *                   description: The message lock
 *             examples:
 *               Lock successfully:
 *                 value:
 *                    isSuccess: true
 *                    message: Lock account successfully!
 *               Get new access token:
 *                 value:
 *                   accessToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXlsb2FkIjoibnNuaGFuIiwiaWF0IjoxNjcyNTU5NTUxLCJleHAiOjE2NzI1NjAxNTF9.9dtX_GD4xQxuJ59Rw7fQFKds4fTJe0bSr4LcjHYyDvw
 *       "400":
 *         description: Failed operation.
 *         content:
 *           application/json:
 *             examples:
 *               Lock failed:
 *                 value:
 *                   isSuccess: false
 *                   message: Can not lock account this user!
 *               Invalid parameter:
 *                 value:
 *                   error: The id parameter must be a positive integer
 *       "401":
 *         description: Unauthorized user
 *         content:
 *           application/json:
 *             example:
 *               message: Unauthorized user!
 */
router.post('/:userId/spendingAccounts/lock', validateParams, authUser, async function(req, res) {
    const userId = +req.params.userId;
    const ret = await bankingAccountModel.lockBankingAccount(userId);

    if (ret === 0)
        return res.status(400).json({
            isSuccess: false,
            message: 'Can not lock account this user!'
        });
    return res.json({
        isSuccess: true,
        message: 'Lock account successfully!'
    });
});

/**
 * @swagger
 * /users/{userId}/spendingAccounts/unlock:
 *   post:
 *     summary: Unlock spending account
 *     tags: [User]
 *     parameters:
 *     - name: userId
 *       in: path
 *       description: User id to unlock account.
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
 *     responses:
 *       "200":
 *         description: Successful operation.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isSuccess:
 *                   type: boolean
 *                   description: The status unlock
 *                 message:
 *                   type: string
 *                   description: The message unlock
 *             examples:
 *               Unlock successfully:
 *                 value:
 *                    isSuccess: true
 *                    message: Unlock account successfully!
 *               Get new access token:
 *                 value:
 *                   accessToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXlsb2FkIjoibnNuaGFuIiwiaWF0IjoxNjcyNTU5NTUxLCJleHAiOjE2NzI1NjAxNTF9.9dtX_GD4xQxuJ59Rw7fQFKds4fTJe0bSr4LcjHYyDvw
 *       "400":
 *         description: Failed operation.
 *         content:
 *           application/json:
 *             examples:
 *               Unlock failed:
 *                 value:
 *                   isSuccess: false
 *                   message: Can not lock account this user!
 *               Invalid parameter:
 *                 value:
 *                   error: The id parameter must be a positive integer
 *       "401":
 *         description: Unauthorized user
 *         content:
 *           application/json:
 *             example:
 *               message: Unauthorized user!
 */
router.post('/:userId/spendingAccounts/unlock', validateParams, authUser, async function(req, res) {
    const userId = +req.params.userId;
    const ret = await bankingAccountModel.unlockBankingAccount(userId);

    if (ret === 0)
        return res.status(400).json({
            isSuccess: false,
            message: 'Can not unlock account this user!'
        });
    return res.json({
        isSuccess: true,
        message: 'Unlock account successfully!'
    });
});

export default router;