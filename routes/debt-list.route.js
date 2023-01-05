import express from 'express';
import moment from 'moment';
import numeral from 'numeral';
import * as dotenv from 'dotenv';
import { readFile } from 'fs/promises';

import createOTP from '../utils/otp.js';
import sendEmail from '../utils/mail.js';
import validate, {validateParams} from '../middlewares/validate.mdw.js';
import {authRole, authUser} from '../middlewares/auth.mdw.js';

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

//Get debt list of self-made by userId API: /api/debtList/selfMade
router.get("/:userId/selfMade",authRole(role.CUSTOMER),async function(req,res){
    try{
        //get userid from body
        const _userId = +req.params.userId || 0;
        const _user = await userModel.genericMethods.findById(_userId);

        if (_user != null){
            const listDebt = await debtListModel.listSelfMade(_userId);
            res.status(200).json({
                isSuccess: true,
                message: "This is all debts of you",
                list_debt: listDebt
            })
        }
        else{
            res.status(500).json({
                isSuccess: false,
                message: "You do not have access",
            })
        }
    }
    catch (err){
        res.status(400).json({
            isSuccess: false,
            message: err.message
        })
    }
})

//Get debt list of other-made by userId API: /api/debtList/otherMade
router.get("/:userId/otherMade",authRole(role.CUSTOMER),async function(req,res){
    try{
        //get userid from body
        const _userId = +req.params.userId || 0;
        const SPENDING_ACCOUNT_TYPE = 1;
        const _userBanking = await bankingAccountModel.findByUserIdAndAccountType(_userId, SPENDING_ACCOUNT_TYPE);
        if (_userBanking.length !== 0){
            const userAccountNumber = _userBanking[0].account_number;
            const listDebt = await debtListModel.listOtherMade(userAccountNumber);
            res.status(200).json({
                isSuccess: true,
                message: "This is all debts of you",
                list_debt: listDebt
            })
        }
        else{
            res.status(500).json({
                isSuccess: false,
                message: "You do not have access",
            })
        }
    }
    catch (err){
        res.status(400).json({
            isSuccess: false,
            message: err.message
        })
    }
})

//Get detail of debt by debtId API : /api/debtList/:debtId
router.get("/:debtId",authRole(role.CUSTOMER),async function(req,res,next){
    try {
        const _debtId= +req.params.debtId || 0;
        const objDebt = await debtListModel.getDebtById(_debtId)
        if (objDebt != null){
            res.status(200).json({
                isSuccess: true,
                message:"This is detail of debt",
                objDebt: objDebt
            })
        }
        else{
            res.status(500).json({
                isSuccess: false,
                message: "Could not find this debt",
            })
        }
    }catch (err){
        res.status(400).json({
            isSuccess: false,
            message: err.message
        })
    }
})

//Create new debt API (internal): /api/debtList/
router.post("/",validate(debtCreateSchema),authUser,authRole(role.CUSTOMER),async function(req,res){
    try{
        const user_id = +req.body.user_id || 0;
        const debt_account_number = req.body.debt_account_number || '';
        const debt_amount = +req.body.debt_amount || 0;
        const debt_message= req.body.debt_message || '';
        if (user_id > 0){
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
        return res.status(400).json({
            isSuccess: false,
            message: 'You do not have access'
        })
    }catch (err){
        return res.status(400).json({
            isSuccess: false,
            message: err.message
        })
    }
})

//send OTP and create temp transaction API: /api/debtList/sendOtp
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

            const checkBalance = await bankingAccountModel.checkBalanceOfUserByAccountNumber(userAccountNumber,balanceDebtor);
            if (!checkBalance){
                return res.status(500).json({
                    isSuccess: false,
                    message: "Your balance is not enough to make the payment"
                })
            }
            //Create transaction
            let newTransaction = {
                src_account_number: senderInfo[0].account_number,
                des_account_number: debtorAccountNumber,
                transaction_amount: debtInfo.debt_amount > 0 ? debtInfo.debt_amount : 0,
                otp_code: otp,
                transaction_message : '',
                pay_transaction_fee: 'DES',
                is_success: false,
                transaction_type: 1,
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
        res.status(500).json({
            isSuccess: false,
            message: "Could not find this debt",
        })

    }catch (err){
        res.status(400).json({
            isSuccess: false,
            message: err.message
        })
    }
})
//API resend OTP for payment
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
        res.status(500).json({
            isSuccess: false,
            message: "Could not find this debt",
        })
    }
    catch (err){
        res.status(400).json({
            isSuccess: false,
            message: err.message
        })
    }
})
//debt payment API (internal): /api/debtList/internal/verified-payment
router.post("/internal/verified-payment",authUser,authRole(role.CUSTOMER),async function(req,res,next){
    try{
        const _debtId = +req.body.debt_id || 0;
        const _userId = +req.body.user_id || 0;
        const _otp = req.body.otp || '';
        const debtDetail = await debtListModel.genericMethods.findById(_debtId);
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
        res.status(500).json({
            isSuccess: false,
            message: "Could not find this debt",
        })
    }catch (err){
        res.status(400).json({
            isSuccess: false,
            message: err.message
        })
    }
})

//Cancel debt by debtId API: /api/debtList/cancelDebt/:debtId
router.delete("/cancelDebt/:debtId",authUser,validate(debtCancelSchema),authRole(role.CUSTOMER),async function(req,res,next){
    try {
        const _debtId = +req.params.debtId || 0;
        const _userId = +req.body.user_id || 0;
        const senderInfo = await userModel.genericMethods.findById(_userId);
        const debtInfo = await debtListModel.genericMethods.findById(_debtId);;
        const messageCancel = req.body.debt_cancel_message || '';
        const objDebt = await debtListModel.getDebtById(_debtId);
        if (objDebt != null){
            //if cancel your debt remind
            if (_userId === objDebt.user_id)
            {
                const bankingInfoRecipient = await bankingAccountModel.getInfoRecipientBy(objDebt.debt_account_number);
                const recipientId = bankingInfoRecipient[0].user_id;
                const transactionId = objDebt.paid_transaction_id;
                //send notify for debtor
                let newNotify = {
                    user_id: recipientId,
                    transaction_id: transactionId,
                    debt_id: _debtId,
                    notification_message: `Debt code ${_debtId} has been cancelled by ${senderInfo.full_name} - ${debtInfo.debt_account_number}`,
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
                const reminderId = objDebt.user_id;
                const transactionId = objDebt.paid_transaction_id;
                //send notify for debt reminder
                let newNotify = {
                    user_id: reminderId,
                    transaction_id: transactionId,
                    debt_id: _debtId,
                    notification_message: messageCancel,
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
            const result = await debtListModel.updateStatusDebtPayment(_debtId,debt_status.CANCEL);

            res.status(200).json({
                isSuccess: true,
                message: "Cancel successful"
            })
        }
        else{
            res.status(500).json({
                isSuccess: false,
                message: "Could not find this debt",
            })
        }

    }catch (err){
        res.status(400).json({
            isSuccess: false,
            message: err.message
        })
    }
})


export default router;