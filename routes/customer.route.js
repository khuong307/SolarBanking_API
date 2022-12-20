import express from "express"
import bankingAccountModel from "../models/banking-account.model.js"
import recipientModel from "../models/recipient.model.js"
import validate, { validateParams } from '../middlewares/validate.mdw.js';
import userModel from "../models/user.model.js"
import transactionsModel from "../models/transactions.model.js";
import generateOtp from "../utils/otp.js"
import generateEmail from "../utils/mail.js"

const router = express.Router()

// Get Source bank ( render to select option in front end)
router.get("/:userId/banks", validateParams, async (req, res) => {
    const userId = +req.params.userId
    try {
        const bankAccounts = await bankingAccountModel.findByUserIdAndAccountType(userId, 1)
        return res.status(200).json({
            isSuccess: true,
            bankAccounts
        })
    } catch (err) {
        console.log(err)
        return res.status(500), json({
            isSuccess: false,
            message: "Can not get bank accounts"
        })
    }
})

// FIrst step : Check Info Inter Transaction Before Real Transfer
router.post("/:userId/intertransaction", validateParams, async (req, res) => {
    const infoTransaction = req.body
    const userId = +req.params.userId
    try {
        // Check src_account_number is existed (belong to userId)
        const result_src = await bankingAccountModel.findByUserIdAndAccountNumber(userId, infoTransaction.src_account_number)
        if (result_src.length === 0) {
            return res.status(403).json({
                isSuccess: false,
                message: "source account number is invalid"
            })
        }

        // Check amount of money is valid corresponding to account_number
        if (infoTransaction.transaction_amount > result_src[0].balance) {
            return res.status(403).json({
                isSuccess: false,
                message: "Money transaction is invalid"
            })
        }

        // Check des_account_number is existed
        const result_des = await bankingAccountModel.findByAccountNumberAndBankCode(infoTransaction.des_account_number, infoTransaction.bank_code)
        if (result_des.length === 0) {
            return res.status(403).json({
                isSuccess: false,
                message: "destination account number is invalid"
            })
        }

        // if des_account_number existed, query to get user's full name of des_account_number
        const result_user_des = await userModel.genericMethods.findById(result_des[0].user_id)

        return res.status(200).json({
            isSuccess: true,
            message: "Confirm transaction is valid",
            infoTransaction: { ...infoTransaction, desFullName: result_user_des.full_name }
        })


    } catch (err) {
        console.log(err)
        return res.status(500).json({
            isSuccess: false,
            message: "Can not confirm the transaction"
        })
    }
})

// Second step: Confirm transaction after all info is correct
router.post("/:userId/transaction/confirm", validateParams, async (req, res) => {
    const userId = +req.params.userId
    const infoTransaction = req.body
    try {
        const result_src = await userModel.genericMethods.findById(userId)
        const src_email = result_src.email
        // Generate otp
        const otp = generateOtp()
        // Send otp to user through email
        const subject = "Transfer Money"
        const message = `Dear ${result_src.full_name}. You have selected ${src_email} as your main verification page:
        ${otp}\nThis code will expire three hours after this email was sent\nWhy you receive this email?\nSolar Banking requires verification whenever an transaction is made.
        If you did not make this request, you can ignore this email`

        generateEmail(src_email,subject,message)

        // insert to table transaction but is_success will set false
        const newTransaction = {...infoTransaction,otp_code:otp,is_success:false}
        const result = await transactionsModel.genericMethods.add(newTransaction)
    
        return res.status(201).json({
            isSuccess:true,
            transactionId:result[0]
        })
    } catch (err) {
        console.log(err)
        return res.status(500).json({
            isSuccess: false,
            message: "Can not confirm the transaction"
        })
    }
})

export default router