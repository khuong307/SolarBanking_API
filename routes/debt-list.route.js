/**
 * @swagger
 * tags:
 *   name: Debt List
 *   description: API to handle features and information belonging to debt list.
 * components:
 *   schemas:
 *     Debt List:
 *       type: object
 *       properties:
 *         debt_id:
 *           type: integer
 *           description: The id of debt.
 *         user_id:
 *           type: integer
 *           description: The id of debt reminder.
 *         debt_account_number:
 *           type: string
 *           description: The account number of debtor.
 *         debt_amount:
 *           type: integer
 *           description: The amount of debt.
 *         debt_message:
 *           type: string
 *           description: The message of debt reminder.
 *         paid_transaction_id:
 *           type: integer
 *           description: The id of transaction.
 *         debt_status:
 *           type: enum
 *           description: The status of debt.
 *         debt_created_at:
 *           type: string
 *           description: The creating date of debt.
 *       example:
 *          debt_id: 1
 *          user_id: 1
 *          debt_account_number: "123456"
 *          debt_amount: 300000
 *          debt_message: "New debt for you"
 *          paid_transaction_id: 1
 *          debt_status: "NOT PAID"
 *          debt_created_at: "2023-01-08 00:34:58"
 */


import express from 'express';
import moment from 'moment';
import numeral from 'numeral';
import * as dotenv from 'dotenv';
import { readFile } from 'fs/promises';

import createOTP from '../utils/otp.js';
import sendEmail from '../utils/mail.js';
import validate, {validateParams} from '../middlewares/validate.mdw.js';
import {authRole, authUser} from '../middlewares/auth.mdw.js';

import {filterDebtByType,isBankingAccountLocked} from "../utils/bank.js";
import debtListModel from "../models/debt-list.model.js";
import notificationModel from "../models/notification.model.js";
import bankingAccountModel from "../models/banking-account.model.js";
import transactionsModel from "../models/transactions.model.js";
import userModel from "../models/user.model.js";
import debt_status from "../utils/debt_status.js";
import role from "../utils/role.js";
import io from '../app.js';

dotenv.config();

const debtCreateSchema = JSON.parse(await readFile(new URL('../schemas/debt-create.json', import.meta.url)));
const debtCancelSchema = JSON.parse(await readFile(new URL('../schemas/debt-cancel.json', import.meta.url)));

const router = express.Router();

/**
 * @swagger
 * /debtList/{userId}/list:
 *   get:
 *     summary: Get all debt of user (self-made and other made)
 *     tags: [Debt List]
 *     parameters:
 *     - name: userId
 *       in: path
 *       description: User id to get debt list
 *       required: true
 *       schema:
 *         type: integer
 *     responses:
 *       "200":
 *         description: Successful operation.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Debt List"
 *             examples:
 *               Get successfully:
 *                 value:
 *                   - debt_id: 1
 *                     user_id: 1
 *                     debt_account_number: "123456"
 *                     debt_amount: 300000
 *                     debt_message: "New debt for you"
 *                     paid_transaction_id: 1
 *                     debt_status: "NOT PAID"
 *                     debt_created_at: "2023-01-08 00:34:58"
 *                   - debt_id: 2
 *                     user_id: 1
 *                     debt_account_number: "123456"
 *                     debt_amount: 40000
 *                     debt_message: "New debt for you"
 *                     paid_transaction_id: 1
 *                     debt_status: "PAID"
 *                     debt_created_at: "2023-01-07 00:34:58"
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
 *         description: Authorized Role
 *         content:
 *           application/json:
 *             example:
 *               message: 'Not allowed user!'
 *       "409":
 *         description: Authorized Role
 *         content:
 *           application/json:
 *             example:
 *               message: 'User not found!'
 */
router.get("/:userId/list",validateParams,authRole(role.CUSTOMER),async function(req,res){
    try{
        //get userid from body
        const _userId = +req.params.userId || 0;
        const _user = await userModel.genericMethods.findById(_userId);
        const SPENDING_ACCOUNT_TYPE = 1;
        const _userBanking = await bankingAccountModel.findByUserIdAndAccountType(_userId, SPENDING_ACCOUNT_TYPE);
        const userAccountNumber = _userBanking.length !== 0 ? _userBanking[0].account_number : '';

        if (_user != null){
            const listSelfMade = await debtListModel.listSelfMade(_userId);
            const listOtherMade = await debtListModel.listOtherMade(userAccountNumber);
            const self_debt_list = await filterDebtByType(listSelfMade,1);
            const other_debt_list = await filterDebtByType(listOtherMade,2);
            return res.status(200).json({
                isSuccess: true,
                message: "Successful operation",
                self_debt_list,
                other_debt_list
            })
        }
        else{
            return res.status(401).json({
                isSuccess: false,
                message: "Unauthorized user",
            })
        }
    }
    catch (err){
        return res.status(400).json({
            isSuccess: false,
            message: err.message
        })
    }
})

/**
 * @swagger
 * /debtList/{debtId}:
 *   get:
 *     summary: Get detail of debt
 *     tags: [Debt List]
 *     parameters:
 *     - name: debtId
 *       in: path
 *       description: The id to get detail of debt
 *       required: true
 *       schema:
 *         type: integer
 *     responses:
 *       "200":
 *         description: Successful operation.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Debt List"
 *             examples:
 *               Get successfully:
 *                 value:
 *                   isSuccess: true
 *                   message: "Successful operation"
 *                   debt_id: 1
 *                   user_id: 1
 *                   debt_account_number: "123456"
 *                   debt_amount: 300000
 *                   debt_message: "New debt for you"
 *                   paid_transaction_id: 1
 *                   debt_status: "NOT PAID"
 *                   debt_created_at: "2023-01-08 00:34:58"
 *       "403":
 *         description: Undefined Debt
 *         content:
 *           application/json:
 *             example:
 *               isSuccess: false
 *               message: Could not find this debt
 */
router.get("/:debtId",async function(req,res,next){
    try {
        const _debtId= +req.params.debtId || 0;
        const objDebt = await debtListModel.getDebtById(_debtId)
        if (objDebt != null){
            res.status(200).json({
                isSuccess: true,
                message:"Successful operation",
                objDebt: objDebt
            })
        }
        else{
            return res.status(403).json({
                isSuccess: false,
                message: "Could not find this debt",
            })
        }
    }catch (err){
        return res.status(400).json({
            isSuccess: false,
            message: err.message
        })
    }
})
/**
 * @swagger
 * /debtList/:
 *   post:
 *     summary: Create new debt
 *     tags: [Debt List]
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
 *       description: Information Debt
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: integer
 *                 description: The id of user create debt
 *               debt_account_number:
 *                 type: string
 *                 description: account number of debtor
 *               debt_amount:
 *                 type: integer
 *                 description: the amount of debt
 *               debt_message:
 *                 type: string
 *                 description: notes for debt
 *           example:
 *             user_id: 1
 *             debt_account_number: "789456"
 *             debt_amount: 30000
 *             debt_message: "Create new debt"
 *     responses:
 *       "200":
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isSuccess:
 *                   type: boolean
 *                   description: successful confirmation
 *                 message:
 *                   type: string
 *                   description: response message
 *             examples:
 *               Get successfully:
 *                 value:
 *                   isSuccess: true
 *                   message: "Create new debt successful!"
 *       "400":
 *         description: Fail parameters
 *         content:
 *           application/json:
 *             example:
 *               Invalid Schema:
 *                 value:
 *                   - instancePath: ""
 *                     schemaPath: "#/required"
 *                     keyword: "required"
 *                     params:
 *                       missingProperty: "debt_amount"
 *                     message: "must have required property 'debt_amount'"
 *       "401":
 *         description: Unauthorized user
 *         content:
 *           application/json:
 *             examples:
 *               Unauthorized user:
 *                 value:
 *                   - isSuccess: false
 *                     message: "Unauthorized user!"
 *       "403":
 *         description: Undefined User
 *         content:
 *           application/json:
 *             examples:
 *               Invalid Account Number:
 *                 value:
 *                   - isSuccess: false
 *                     message: "Debtor's account does not exist"
 *               Unauthorized Role:
 *                 value:
 *                   - message: 'Not allowed user!'
 *       "409":
 *         description: Authorized Role
 *         content:
 *           application/json:
 *             example:
 *               message: 'User not found!'
 */
router.post("/",validate(debtCreateSchema),authUser,authRole(role.CUSTOMER),async function(req,res){
    try{
        const user_id = +req.body.user_id || 0;
        const debt_account_number = req.body.debt_account_number || '';
        const debt_amount = +req.body.debt_amount || 0;
        const debt_message= req.body.debt_message || '';
        if (user_id > 0){
            const debtInfoBanking = await bankingAccountModel.checkExistBy(debt_account_number,"SLB");
            if (!debtInfoBanking){
                return res.status(403).json({
                    isSuccess: false,
                    message: 'Debtor\'s account does not exist'
                })
            }
            const userReminder = await userModel.genericMethods.findById(user_id);
            const accountReminder = await bankingAccountModel.findByUserIdAndAccountType(user_id, 1);
            let newDebt = {
                user_id: user_id,
                debt_account_number: debt_account_number,
                debt_amount: debt_amount,
                debt_message: debt_message,
                paid_transaction_id : null,
                debt_status: debt_status.NOTPAID,
                debt_cancel_message: ''
            }
            //Create new debt
            const ret = await debtListModel.genericMethods.add(newDebt);
            const recipientIndo = await bankingAccountModel.getInfoRecipientBy(debt_account_number);

            //send notify for debt reminder
            let newNotify = {
                user_id: recipientIndo[0].user_id,
                transaction_id: null,
                debt_id: ret[0],
                notification_message: `You have a new debt with amount ${numeral(debt_amount).format('0,0')} VND from ${userReminder.full_name} - ${accountReminder[0].account_number}`,
                is_seen: 0,
                notification_title: 'Debt Reminder',
                notification_created_at: new Date()
            };
            //add new notification
            const results = await notificationModel.genericMethods.add(newNotify);
            io.emit(`new-notification-${recipientIndo[0].user_id}`, {
                notification_id: results[0],
                ...newNotify
            });

            //Send mail for recipient
            const VERIFY_EMAIL_SUBJECT = 'Solar Banking: You have new debt';
            const OTP_MESSAGE = `
            Dear ${recipientIndo[0].full_name},\n
            We've noted you have a payment reminder. Debit code is: ${ret[0]}.`;
            sendEmail(recipientIndo[0].email, VERIFY_EMAIL_SUBJECT, OTP_MESSAGE);

            return res.status(200).json({
                isSuccess: true,
                message: 'Create new debt successful!'
            })
        }
        return res.status(401).json({
            isSuccess: false,
            message: 'Unauthorized user!'
        })
    }catch (err){
        return res.status(400).json({
            isSuccess: false,
            message: err.message
        })
    }
})

router.get("/:userId/checkBalance",authRole(role.CUSTOMER),async function(req,res){
    try {
        const user_id = +req.params.userId;
        const balance = +req.query.amount;
        console.log(balance);
        const _user = await userModel.genericMethods.findById(user_id);
        if (_user != null){
            const SPENDING_ACCOUNT_TYPE = 1;
            const _userBanking = await bankingAccountModel.findByUserIdAndAccountType(user_id, SPENDING_ACCOUNT_TYPE);
            const userAccountNumber = _userBanking.length !== 0 ? _userBanking[0].account_number : '';
            const userBalance = _userBanking.length !== 0 ? _userBanking[0].balance : '';
            const checkBlockedAccount = await isBankingAccountLocked(userAccountNumber);
            if (checkBlockedAccount){
                return res.status(500).json({
                    isEnough: false,
                    message: "Your account is blocked!"
                })
            }
            if (balance > userBalance){
                return res.status(200).json({
                    isEnough: false,
                    message: "Your balance is not enough to make the payment"
                })
            }
            return res.status(200).json({
                isEnough: true,
                message: "Your balance is enough to make the payment"
            })
        }
        return res.status(403).json({
            isEnough: false,
            message: "User is not exist"
        })
    }catch (err) {
        return res.status(400).json({
            isEnough: false,
            message: err.message
        })
    }
})

/**
 * @swagger
 * /debtList/sendOtp:
 *   post:
 *     summary: Send otp through user email to verify payment
 *     tags: [Debt List]
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
 *       description: include id of user and id of debt to verify
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: integer
 *                 description: id of user
 *               debt_id:
 *                 type: integer
 *                 description: id of debt
 *           example:
 *             user_id: 1
 *             debt_id: 1
 *     responses:
 *       "200":
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isSuccess:
 *                   type: boolean
 *                   description: successful confirmation
 *                 message:
 *                   type: string
 *                   description: response message
 *             example:
 *               isSuccess: true
 *               message: "OTP code has been sent. Please check your email"
 *       "401":
 *         description: Unauthorized user
 *         content:
 *           application/json:
 *             example:
 *               message: 'Unauthorized user'
 *       "403":
 *         description: Undefined Debt & Authorized Role
 *         content:
 *           application/json:
 *             example:
 *               Undefined Debt:
 *                 value:
 *                   isSuccess: false
 *                   message: "Could not find this debt"
 *               Authorized Role:
 *                 value:
 *                   message: 'Not allowed user!'
 *       "409":
 *         description: Authorized Role
 *         content:
 *           application/json:
 *             example:
 *               message: 'User not found!'
 */
router.post("/sendOtp",authUser,authRole(role.CUSTOMER),async function(req,res,next){
    try{
        const userId = +req.body.user_id || 0;
        const debtId = +req.body.debt_id || 0;
        const otp = createOTP();
        const SPENDING_ACCOUNT_TYPE = 1;
        const debtInfo = await debtListModel.genericMethods.findById(debtId);
        if(debtInfo != null){
            const debtorAccountNumber = debtInfo.debt_account_number;
            const senderId = debtInfo.user_id;
            const bankingInfoUser = await bankingAccountModel.findByUserIdAndAccountType(userId, SPENDING_ACCOUNT_TYPE);
            const userAccountNumber = bankingInfoUser[0].account_number;
            const debtorInfo = await bankingAccountModel.getInfoRecipientBy(userAccountNumber);
            const senderInfo = await bankingAccountModel.findByUserIdAndAccountType(senderId, SPENDING_ACCOUNT_TYPE);

            const emailDebtor = debtorInfo[0].email || "";
            const nameDebtor = debtorInfo[0].full_name || "";
            const balanceDebtor = debtorInfo[0].balance || 0;

            //Create transaction
            let newTransaction = {
                src_account_number: debtorAccountNumber,
                des_account_number:  senderInfo[0].account_number,
                transaction_amount: debtInfo.debt_amount > 0 ? debtInfo.debt_amount : 0,
                otp_code: otp,
                transaction_message : '',
                pay_transaction_fee: 'SRC',
                is_success: false,
                transaction_type: 2,
                transaction_created_at: moment().add(process.env.otp_time, 's').toDate()
            };
            const ret = await transactionsModel.genericMethods.add(newTransaction);
            const transactionId = ret[0];
            //update transaction_id in debt table
            await debtListModel.updateTransIdDebtPayment(debtId,transactionId);

            //Send otp mail for debtor
            const VERIFY_EMAIL_SUBJECT = 'Solar Banking: Please verify your payment';
            const OTP_MESSAGE = `
            Dear ${nameDebtor},\n
            Here is the OTP code you need to verified payment: ${otp}.\n
            This code will be expired 5 minutes after this email was sent. If you did not make this request, you can ignore this email.
            `;
            sendEmail(emailDebtor, VERIFY_EMAIL_SUBJECT, OTP_MESSAGE);

            return res.status(200).json({
                isSuccess: true,
                message: "OTP code has been sent. Please check your email",
            })
        }
        return res.status(403).json({
            isSuccess: false,
            message: "Could not find this debt",
        })

    }catch (err){
        return res.status(400).json({
            isSuccess: false,
            message: err.message
        })
    }
})
/**
 * @swagger
 * /debtList/re-sendOtp:
 *   post:
 *     summary: Re-Send otp through user email to verify payment
 *     tags: [Debt List]
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
 *       description: include id of user and id of debt to verify
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: integer
 *                 description: id of user
 *               debt_id:
 *                 type: integer
 *                 description: id of debt
 *           example:
 *             user_id: 1
 *             debt_id: 1
 *     responses:
 *       "200":
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isSuccess:
 *                   type: boolean
 *                   description: successful confirmation
 *                 message:
 *                   type: string
 *                   description: response message
 *             example:
 *               isSuccess: true
 *               message: "OTP code has been sent. Please check your email"
 *       "401":
 *         description: Unauthorized user
 *         content:
 *           application/json:
 *             example:
 *               message: 'Unauthorized user'
 *       "403":
 *         description: Undefined Debt
 *         content:
 *           application/json:
 *             examples:
 *               Undefined Debt:
 *                 value:
 *                   isSuccess: false
 *                   message: "Could not find this debt"
 *               Authorized Role:
 *                 value:
 *                   message: 'Not allowed user!'
 *       "409":
 *         description: Authorized Role
 *         content:
 *           application/json:
 *             example:
 *               message: 'User not found!'
 */
router.post("/re-sendOtp",authUser,authRole(role.CUSTOMER),async function(req,res){
    try{
        const userId = +req.body.user_id || 0;
        const debtId = +req.body.debt_id || 0;
        const otp = createOTP();
        const SPENDING_ACCOUNT_TYPE = 1;
        const debtInfo = await debtListModel.genericMethods.findById(debtId);
        if(debtInfo !== null){
            const bankingInfoUser = await bankingAccountModel.findByUserIdAndAccountType(userId, SPENDING_ACCOUNT_TYPE);
            const userAccountNumber = bankingInfoUser[0].account_number;
            const debtorInfo = await bankingAccountModel.getInfoRecipientBy(userAccountNumber);

            const emailDebtor = debtorInfo[0].email || "";
            const nameDebtor = debtorInfo[0].full_name || "";
            const trans_id = debtInfo.paid_transaction_id;
            //update otp when user resend
            await transactionsModel.updateOTPForPayDebt(trans_id,otp)

            //Send otp mail for debtor
            const VERIFY_EMAIL_SUBJECT = 'Solar Banking: Please verify your payment';
            const OTP_MESSAGE = `
            Dear ${nameDebtor},\n
            Here is the OTP code you need to verified payment: ${otp}.\n
            This code will be expired 5 minutes after this email was sent. If you did not make this request, you can ignore this email.
            `;
            sendEmail(emailDebtor, VERIFY_EMAIL_SUBJECT, OTP_MESSAGE);

            return res.status(200).json({
                isSuccess: true,
                message: "OTP code has been sent. Please check your email",
            })
        }
        return res.status(403).json({
            isSuccess: false,
            message: "Could not find this debt",
        })
    }
    catch (err){
        return res.status(400).json({
            isSuccess: false,
            message: err.message
        })
    }
})
/**
 * @swagger
 * /debtList/internal/verified-payment:
 *   post:
 *     summary: Verify payment debt
 *     tags: [Debt List]
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
 *       description: include id of user, id of debt and otp code to verify
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: integer
 *                 description: id of user
 *               debt_id:
 *                 type: integer
 *                 description: id of debt
 *               otp:
 *                 type: string
 *                 description: otp code
 *           example:
 *             user_id: 1
 *             debt_id: 1
 *             otp: "453677"
 *     responses:
 *       "200":
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isSuccess:
 *                   type: boolean
 *                   description: successful confirmation
 *                 message:
 *                   type: string
 *                   description: response message
 *                 status:
 *                   type: string
 *                   description: status of debt
 *             example:
 *               isSuccess: true
 *               message: "Payment Successful"
 *               status: "PAID"
 *       "401":
 *         description: Unauthorized user
 *         content:
 *           application/json:
 *             example:
 *               message: 'Unauthorized user'
 *       "403":
 *         description: Undefined Debt & Authorized Role
 *         content:
 *           application/json:
 *             examples:
 *               Undefined Debt:
 *                 value:
 *                   isSuccess: false
 *                   message: "Could not find this debt"
 *               Authorized Role:
 *                 value:
 *                   message: 'Not allowed user!'
 *       "409":
 *         description: Authorized Role
 *         content:
 *           application/json:
 *             example:
 *               message: 'User not found!'
 *       "500":
 *         description: Fail conditions
 *         content:
 *           application/json:
 *             examples:
 *               OTP Empty:
 *                 value:
 *                   - isSuccess: false
 *                     message: "OTP is empty"
 *               Invalid OTP:
 *                 value:
 *                   - isSuccess: false
 *                     message: "Validation failed. OTP code may be incorrect or the session was expired!"
 */
router.post("/internal/verified-payment",authUser,authRole(role.CUSTOMER),async function(req,res,next){
    try{
        const _debtId = +req.body.debt_id || 0;
        const _userId = +req.body.user_id || 0;
        const _otp = req.body.otp || '';
        const debtDetail = await debtListModel.genericMethods.findById(_debtId);
        if (_otp === ""){
            return res.status(500).json({
                isSuccess: false,
                message: 'OTP is empty'
            });
        }
        if (debtDetail !== null){
            const senderId = _userId;
            const senderInfo = await userModel.genericMethods.findById(senderId);
            const recipientId = debtDetail.user_id;
            const debt_amount = debtDetail.debt_amount;
            const transId = debtDetail.paid_transaction_id;
            const transDetail = await transactionsModel.genericMethods.findById(transId);
            //Step 1: Verified OTP code
            console.log(transDetail.otp_code)
            console.log(moment().isBefore(transDetail.transaction_created_at))
            if (_otp === transDetail.otp_code && moment().isBefore(transDetail.transaction_created_at)){
                //Step 2: Update status for debt detail
                await debtListModel.updateStatusDebtPayment(_debtId,debt_status.PAID);
                //Step 3: Update status of transaction
                await transactionsModel.updateStatusTransaction(transId,true);
                //Step 4.1: Update account balance of debtor
                await bankingAccountModel.updateAccountBalance(senderId,debt_amount,1);
                //Step 4.2: Update account balance of debt reminder
                await bankingAccountModel.updateAccountBalance(recipientId,debt_amount,2);
                //Step 5: Send notify for debt reminder
                let newNotify = {
                    user_id: recipientId,
                    transaction_id: transId,
                    debt_id: _debtId,
                    notification_message: `Debt code ${_debtId} has been paid by ${senderInfo.full_name} - ${debtDetail.debt_account_number}.`,
                    is_seen: 0,
                    notification_title: 'Debt Payment',
                    notification_created_at: new Date()
                };
                //add new notification
                const ret = await notificationModel.genericMethods.add(newNotify);
                io.emit(`new-notification-${recipientId}`, {
                    notification_id: ret[0],
                    ...newNotify
                });
                return res.status(200).json({
                    isSuccess: true,
                    message: "Payment Successful",
                    status: debt_status.PAID,
                })
            }
            return res.status(500).json({
                isSuccess: false,
                message: 'Validation failed. OTP code may be incorrect or the session was expired!'
            });
        }
        return res.status(403).json({
            isSuccess: false,
            message: "Could not find this debt",
        })
    }catch (err){
        return res.status(400).json({
            isSuccess: false,
            message: err.message
        })
    }
})

/**
 * @swagger
 * /debtList/cancelDebt/{debtId}:
 *   put:
 *     summary: Cancel debt (change status debt)
 *     tags: [Debt List]
 *     parameters:
 *       - name: debtId
 *         in: path
 *         description: The id to cancel debt
 *         required: true
 *         schema:
 *           type: integer
 *       - name: access_token
 *         in: header
 *         description: A string is used to access authentication features
 *         schema:
 *           type: string
 *       - name: refresh_token
 *         in: header
 *         description: A string is used to refresh access token if expired
 *         schema:
 *           type: string
 *     requestBody:
 *       description: id of user cancel and message
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: integer
 *                 description: The id of user create debt
 *               debt_cancel_message:
 *                 type: string
 *                 description: reasons for debt cancellation
 *           example:
 *             user_id: 1
 *             debt_cancel_message: "Not enough money to pay the debt"
 *     responses:
 *       "200":
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isSuccess:
 *                   type: boolean
 *                   description: successful confirmation
 *                 message:
 *                   type: string
 *                   description: response message
 *             example:
 *               isSuccess: true
 *               message: "Cancel successful"
 *       "400":
 *         description: Fail parameters
 *         content:
 *           application/json:
 *             example:
 *               Invalid Schema:
 *                 value:
 *                   - instancePath: ""
 *                     schemaPath: "#/required"
 *                     keyword: "required"
 *                     params:
 *                       missingProperty: "debt_cancel_message"
 *                     message: "must have required property 'debt_cancel_message'"
 *       "401":
 *         description: Unauthorized user
 *         content:
 *           application/json:
 *             example:
 *               message: 'Unauthorized user'
 *       "403":
 *         description: Undefined Debt
 *         content:
 *           application/json:
 *             examples:
 *               Undefined Debt:
 *                 value:
 *                   isSuccess: false
 *                   message: "Could not find this debt"
 *               Authorized Role:
 *                 value:
 *                   message: 'Not allowed user!'
 *       "409":
 *         description: Authorized Role
 *         content:
 *           application/json:
 *             example:
 *               message: 'User not found!'
 */
router.put("/cancelDebt/:debtId",validate(debtCancelSchema),authUser,authRole(role.CUSTOMER),async function(req,res,next){
    try {
        const _debtId = +req.params.debtId || 0;
        const _userId = +req.body.user_id || 0;
        const messageCancel = req.body.debt_cancel_message || '';
        const senderInfo = await userModel.genericMethods.findById(_userId);
        const debtInfo = await debtListModel.getDebtById(_debtId);
        if (debtInfo != null){
            //if cancel your debt remind
            if (_userId === debtInfo.user_id)
            {
                const bankingInfoRecipient = await bankingAccountModel.getInfoRecipientBy(debtInfo.debt_account_number);
                const recipientId = bankingInfoRecipient[0].user_id;
                const transactionId = debtInfo.paid_transaction_id;
                const bankingAccountSender = await bankingAccountModel.findByUserIdAndAccountType(_userId, 1);
                //send notify for debtor
                let newNotify = {
                    user_id: recipientId,
                    transaction_id: transactionId,
                    debt_id: _debtId,
                    notification_message: `Debt code ${_debtId} has been cancelled by ${senderInfo.full_name} - ${bankingAccountSender[0].account_number} with message: ${messageCancel}`,
                    is_seen: 0,
                    notification_title: 'Debt Cancellation',
                    notification_created_at: new Date()
                };
                //add new notification
                const ret = await notificationModel.genericMethods.add(newNotify);
                io.emit(`new-notification-${recipientId}`, {
                    notification_id: ret[0],
                    ...newNotify
                });
            }
            else{
                //if cancel debt of another
                const reminderId = debtInfo.user_id;
                const transactionId = debtInfo.paid_transaction_id;
                //send notify for debt reminder
                let newNotify = {
                    user_id: reminderId,
                    transaction_id: transactionId,
                    debt_id: _debtId,
                    notification_message: `Debt code ${_debtId} has been cancelled by ${senderInfo.full_name} - ${debtInfo.account_number} with message: ` + messageCancel,
                    is_seen: 0,
                    notification_title: 'Debt Cancellation',
                    notification_created_at: new Date()
                };
                //add new notification
                const ret = await notificationModel.genericMethods.add(newNotify);
                io.emit(`new-notification-${reminderId}`, {
                    notification_id: ret[0],
                    ...newNotify
                });
            }
            const result = await debtListModel.updateStatusDebtPayment(_debtId,debt_status.CANCEL,messageCancel);

            return res.status(200).json({
                isSuccess: true,
                message: "Cancel successful"
            })
        }
        else{
            return res.status(403).json({
                isSuccess: false,
                message: "Could not find this debt",
            })
        }

    }catch (err){
        return res.status(400).json({
            isSuccess: false,
            message: err.message
        })
    }
})


export default router;