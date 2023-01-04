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

import express from 'express';
import { readFile } from 'fs/promises';

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
 *         description: Not allowed user
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
 *         description: Not allowed user
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
 *         description: Not allowed user
 *         content:
 *           application/json:
 *             example:
 *               message: Not allowed user!
 */
router.get('/:userId/spendAccounts', validateParams, authUser, authRole(role.CUSTOMER), async function(req, res) {
    const userId = +req.params.userId;
    const SPENDING_ACCOUNT_TYPE = 1;
    const accounts = await bankingAccountModel.findByUserIdAndAccountType(userId, SPENDING_ACCOUNT_TYPE);

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
 *         description: Not allowed user
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

// Get recipient list by user id API
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

// Add a recipient API
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
        // Call API from connected bank to check existing account.
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
                const owner = await userAccountModel.findByUserId(bankingAccount.user_id);
                nickname = owner.username;
            }

            const recipient = {
                user_id: userId,
                account_number: accountNumber,
                nick_name: nickname
            };

            await recipientModel.genericMethods.add(recipient);
            recipient.owner_id = bankingAccount.user_id;

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

// Update nickname of a recipient API
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

// Delete recipient API
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

// Get list of transaction history
router.get('/:userId/history', validateParams, authUser, authRole(role.CUSTOMER), async function(req, res) {
    const userId = +req.params.userId;
    const userAccounts =   await banking_accountModel.genericMethods.findByColMany("user_id", userId)
    var userInfo = ""
    for (const c of userAccounts){
        if (c.is_spend_account == 1){
            userInfo = c
        }
    }
    if (userInfo == null){
        return res.status(209).json({
            isFound: false,
            message: "User ID is invalid!"
        })
    }
    else{
        const accessInfo = userInfo.account_number
        const chargeData = await transactionModel.genericMethods.findBy2ColMany("des_account_number", accessInfo, "src_account_number", "SLB")
        const all_transaction = await transactionModel.genericMethods.findByColMany("src_account_number", accessInfo)
        const transfer_list_by_customer = await filterTransactionByTypeAndDes(all_transaction, 1, 1,false)
        const charge_by_SLB = await filterTransactionByTypeAndDes(chargeData, 1, 1, true)
        const paid_debt_list = await filterTransactionByTypeAndDes(all_transaction, 2, false)

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

// Get notification by user id
router.get('/:userId/notifications', validateParams, authUser, authRole(role.CUSTOMER), async function(req, res) {
    const MAX_NOTIFICATION_LENGTH = 1000;
    const userId = +req.params.userId;
    const limit = +req.query.limit || MAX_NOTIFICATION_LENGTH;

    const notifications = await notificationModel.getNotificationsByUserId(userId, limit);

    return res.json(notifications);
});

// Update is_seen status of all notifications
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

// Update is_seen status by notification id
router.put('/notifications/:notificationId', authUser, authRole(role.CUSTOMER), async function(req, res) {
    const notificationId = +req.params.notificationId;

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

export default router;