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

dotenv.config();

const debtCreateSchema = JSON.parse(await readFile(new URL('../schemas/debt-create.json', import.meta.url)));
const debtCancelSchema = JSON.parse(await readFile(new URL('../schemas/debt-cancel.json', import.meta.url)));

const router = express.Router();

//Get debt list of user by userId API
router.get("/",async function(req,res){
    try{
        //get userid from body
        const _userId = +req.body.userId;
        if (_userId > 0){
            const listDebt = await debtListModel.listAll(_userId);
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
        const _debtId= +req.params.debtId;
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

router.delete("/delDebt/:debtId",validate(debtCancelSchema),async function(req,res,next){
    try {
        const _debtId = +req.params.debtId;
        const messageCancel = req.body.debt_cancel_message;
        const objDebt = await debtListModel.getDebtById(_debtId)
        if (objDebt != null){
            const userIdNoti = objDebt.user_id_to != objDebt.user_id ? objDebt.user_id_to : objDebt.user_id;
            const transactionId = objDebt.paid_transaction_id
            let noti = {
                user_id: userIdNoti,
                transaction_id: transactionId,
                debt_id: _debtId,
                notification_message: messageCancel,
                is_seen: 0
            }
            //add new notification
            await notificationModel.genericMethods.add(noti);
            await debtListModel.genericMethods.delete(_debtId);

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