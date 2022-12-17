import express from 'express';
import bcrypt from 'bcrypt';
import moment from 'moment';
import * as dotenv from 'dotenv';
import { readFile } from 'fs/promises';

import jwt from '../utils/jwt.js';
import createOTP from '../utils/otp.js';
import sendEmail from '../utils/mail.js';
import validate, {validateParams} from '../middlewares/validate.mdw.js';
import {authUser} from '../middlewares/auth.mdw.js';

import debtListModel from "../models/debt-list.model.js";
import notificationModel from "../models/notification.model.js";
import bankingAccountModel from "../models/banking-account.model.js";
import transactionsModel from "../models/transactions.model.js";
import userModel from "../models/user.model.js";

dotenv.config();

const debtCreateSchema = JSON.parse(await readFile(new URL('../schemas/debt-create.json', import.meta.url)));
const debtCancelSchema = JSON.parse(await readFile(new URL('../schemas/debt-cancel.json', import.meta.url)));

const router = express.Router();

//Get debt list of user by userId API
router.get("/",async function(req,res){
    try{
        //get userid from body
        const _userId = +req.body.userId || 0;
        const _userBanking = await  bankingAccountModel.findByUserId(_userId);
        if (_user !== null){
            //get accountNumber of user
            const _accountNumber = _userBanking[0].account_number;
            const listDebt = await debtListModel.listAll(_userId,_accountNumber);
            if (listDebt.count > 0){
                res.status(200).json({
                    isSuccess: true,
                    message: "This is all debts of you",
                    list_debt: listDebt
                })
            }
        }
        else{
            res.status(500).json({
                isSuccess: false,
                message: "User is not allowed to access",
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

//Get detail of debt by debtId API
router.get("/:debtId",async function(req,res,next){
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

//Create new debt API
router.post("/",validate(debtCreateSchema),async function(req,res){
    try{

    }catch (err){
        res.status(400).json({
            isSuccess: false,
            message: err.message
        })
    }
})

//send OTP and create temp transaction API
router.post("/sendotp",async function(req,res,next){
    try{
        const senderId = +req.body.user_id || 0;
        const debtId = +req.body.debt_id || 0;
        const otp = createOTP();
        if(debtId > 0){
            const debtInfo = await debtListModel.genericMethods.findById(debtId);
            const recipientAccountNumber = debtInfo.debt_account_number;
            const bankingInfoSender = await bankingAccountModel.findByUserId(senderId);
            const recipientId = await bankingAccountModel.findUserIdByAccountNumber(recipientAccountNumber);
            const recipientInfo = await userModel.genericMethods.findById(recipientId);
            const emailRecipient = recipientInfo != null ? recipientInfo.email : '';
            //Create transaction
            let newTransaction = {
                src_account_number: bankingInfoSender != null ? bankingInfoSender.debt_account_number : "",
                des_account_number: recipientAccountNumber,
                transaction_amount: debtInfo.debt_amount > 0 ? debtInfo.debt_amount : 0,
                otp_code: otp,
                transaction_message : '',
                pay_transaction_fee: 'SRC',
                is_success: 0,
                transaction_type: 1
            };
            const ret = await transactionsModel.genericMethods.add(newTransaction);
            //Template mail
            const VERIFY_EMAIL_SUBJECT = 'Solar Banking: Please verify your payment';
            const OTP_MESSAGE = `
            Dear ${recipientInfo.full_name},\n
            Here is the OTP code you need to verified payment: ${otp}.\n
            This code will be expired 5 minutes after this email was sent. If you did not make this request, you can ignore this email.   
            `;
            sendEmail(emailRecipient, VERIFY_EMAIL_SUBJECT, OTP_MESSAGE);

            const transactionId = ret[0];
            //update transaction_id in debt table
            await debtListModel.updateTransIdDebtPayment(debtId,transactionId);
            res.status(200).json({
                isSuccess: true,
                message: "OTP code has been sent. Please check your email"
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

//debt payment API
router.post("/verified-payment",async function(req,res,next){
    try{
        const _debtId = +req.body.debtId || 0;
        const _otp = +req.body.otp || '';
        const debtDetail = await debtListModel.genericMethods.findById(_debtId);
        if (debtDetail !== null){
            const transId = debtDetail[0].paid_transaction_id;
            const transDetail = await transactionsModel.genericMethods.findById(transId);
            //Step 1: Verified OTP code
            if (_otp === transDetail.otp_code && moment().isBefore(transDetail.transaction_created_at)){
                //Step 2: Update status for debt detail
                const status = "PAID";
                await debtListModel.updateStatusDebtPayment(_debtId,status);
                //Step 3: Update status of transaction
                await transactionsModel.updateStatusTransaction(transId,1);
                //Step 4: Send notify for debt reminder
                const recipientId = debtDetail[0].user_id;
                let newNoti = {
                    user_id: recipientId,
                    transaction_id: transId,
                    debt_id: _debtId,
                    notification_message: `Debit code ${_debtId} has just been paid. Please check your account`,
                    is_seen: 0
                };
                //add new notification
                await notificationModel.genericMethods.add(newNoti);
                res.status(200).json({
                    isSuccess: true,
                    message: "Payment Successful",
                    status: status,

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

//Cancel debt by debtId API
router.post("/cancelDebt/:debtId",validate(debtCancelSchema),async function(req,res,next){
    try {
        const _debtId = +req.params.debtId || 0;
        const _userId = +req.body.userId || 0;
        const messageCancel = req.body.debt_cancel_message || '';
        const objDebt = await debtListModel.getDebtById(_debtId);
        if (objDebt != null){
            //if cancel your debt
            if (_userId === objDebt.user_id)
            {
                const recipientId = _userId; //send to yourself
                const transactionId = objDebt.paid_transaction_id
                let newNoti = {
                    user_id: recipientId,
                    transaction_id: transactionId,
                    debt_id: _debtId,
                    notification_message: messageCancel,
                    is_seen: 0
                };
                //add new notification
                await notificationModel.genericMethods.add(newNoti);
            }
            else{
                //if cancel debt of another
                const userAccountNumber = objDebt.debt_account_number;
                const userBanking = await bankingAccountModel.genericMethods.findById(userAccountNumber);
                const recipientId = userBanking[0].user_id; //send to yourself
                const transactionId = objDebt.paid_transaction_id;
                let newNoti = {
                    user_id: recipientId,
                    transaction_id: transactionId,
                    debt_id: _debtId,
                    notification_message: messageCancel,
                    is_seen: 0
                };
                //add new notification
                await notificationModel.genericMethods.add(newNoti);
            }
            const result = await debtListModel.updateStatusDebtPayment(_debtId,'CANCEL');

            res.status(200).json({
                isSuccess: true,
                message: "Delete successful"
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