import express from "express"
import bankingAccountModel from "../models/banking-account.model.js"
import recipientModel from "../models/recipient.model.js"
import validate, { validateParams } from '../middlewares/validate.mdw.js';
import userModel from "../models/user.model.js"
import transactionModel from "../models/transaction.model.js";
import bankModel from "../models/bank.model.js";
import generateOtp from "../utils/otp.js"
import generateEmail from "../utils/mail.js"
import datetime_func from "../utils/datetime_func.js";
import { BANK_CODE, EXPIRED_RSA_TIME, TRANSFER_FEE } from "../utils/bank_constanst.js";
import { generateDesTransfer, generateOtpContentTransfer, generateSrcTransfer } from "../utils/bank.js";
import jwt from "../utils/jwt.js";
import axios from "axios";


const router = express.Router()

router.get("/:userId/bankaccounts", validateParams, async (req, res) => {
    const userId = +req.params.userId
    try {
        const bankAccounts = await bankingAccountModel.findByUserIdAndAccountType(userId, 1)
        return res.status(200).json({
            isSuccess: true,
            bankAccounts
        })
    } catch (err) {
        console.log(err)
        return res.status(500).json({
            isSuccess: false,
            message: "Can not get bank accounts"
        })
    }
})

router.get("/:userId/bankaccount", validateParams, async (req, res) => {
    const userId = +req.params.userId
    try {
        const bankAccount = await bankingAccountModel.findByUserIdAndBankCode(userId)
        if (bankAccount === null) {
            return res.status(403).json({
                isSuccess: false,
                message: "Can not get bank account"
            })
        }
        return res.status(200).json({
            isSuccess: true,
            bankAccount
        })
    } catch (err) {
        console.log(err)
        return res.status(500).json({
            isSuccess: false,
            message: "Can not get bank account"
        })
    }
})

// ------------------ INTERBANK: CHUYEN KHOAN NOI BO -------------------- //

// FIrst step : Check Info Inter Transaction Before Real Transfer
router.post("/:userId/intratransaction", validateParams, async (req, res) => {
    const infoTransaction = req.body
    console.log(infoTransaction)
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
            infoTransaction: { ...infoTransaction, full_name: result_user_des.full_name, transaction_type: 1 }
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
router.post("/:userId/intratransaction/confirm", validateParams, async (req, res) => {
    const userId = +req.params.userId
    const infoTransaction = req.body
    try {
        // Check amount money transfer is valid before initialize otp ( prevent hacker)
        const srcBankAccount = await bankingAccountModel.genericMethods.findById(infoTransaction.src_account_number)
        // Check amount of money is valid corresponding to account_number
        if (infoTransaction.transaction_amount > srcBankAccount.balance) {
            return res.status(403).json({
                isSuccess: false,
                message: "Money transaction is invalid"
            })
        }

        // Generate otp
        const otp = generateOtp()
        // insert to table transaction but is_success will set false
        const newTransaction = { ...infoTransaction, otp_code: otp, is_success: false }
        const result = await transactionModel.genericMethods.add(newTransaction)

        // Find source user by id
        const result_src = await userModel.genericMethods.findById(userId)

        // Send otp to user through email
        const subject = "Transfer Money"
        const message = generateOtpContentTransfer(result_src.full_name, result_src.email, otp)

        generateEmail(result_src.email, subject, message)

        return res.status(201).json({
            isSuccess: true,
            transactionId: result[0]
        })
    } catch (err) {
        console.log(err)
        return res.status(500).json({
            isSuccess: false,
            message: "Can not confirm the transaction"
        })
    }
})

// Final Step: Valid OTP and Transaction completed
router.post("/intratransaction/:id", async (req, res) => {
    const transactionId = req.params.id
    const otpInfo = req.body
    try {
        // Check transaction exist in database ( based on transactionId and not success)
        const dataTransaction = await transactionModel.findTransactionNotSuccessById(transactionId)
        if (dataTransaction === null) {
            console.log(dataTransaction)
            return res.status(403).json({
                isSuccess: false,
                message: "Transaction has already completed"
            })
        }

        console.log(otpInfo.created_at)
        console.log(dataTransaction.transaction_created_at)

        const otpSendTime = datetime_func.convertStringToDate(otpInfo.created_at)
        const otpCreatedTime = datetime_func.convertStringToDate(dataTransaction.transaction_created_at)
        const diff = datetime_func.diff_minutes(otpSendTime, otpCreatedTime)
        console.log(otpSendTime)
        console.log(otpCreatedTime)
        console.log(diff)
        // Otp failed or time valid for otp is expired 
        if (otpInfo.otpCode !== dataTransaction.otp_code || diff > 5) {
            return res.status(403).json({
                isSuccess: false,
                message: "Transaction failed! OTP Code is expired"
            })
        }

        // Query bank account of src and des
        let srcBankAccount = await bankingAccountModel.genericMethods.findById(dataTransaction.src_account_number)
        let desBankAccount = await bankingAccountModel.genericMethods.findById(dataTransaction.des_account_number)
        // If Paid by Sender -> Charge fee for sender + Minus money
        if (dataTransaction.pay_transaction_fee === "SRC") {
            // Check Balance after transfer is not zero or negative value
            if (srcBankAccount.balance - TRANSFER_FEE - dataTransaction.transaction_amount <= 0) {
                return res.status(403).json({
                    isSuccess: false,
                    message: "Transaction failed! Balance is not enough for transfer"
                })
            }
            srcBankAccount = {
                ...srcBankAccount,
                balance: srcBankAccount.balance - TRANSFER_FEE - dataTransaction.transaction_amount
            }
        } else {
            srcBankAccount = {
                ...srcBankAccount,
                balance: srcBankAccount.balance - dataTransaction.transaction_amount
            }
        }

        // If Paid By Receiver => Charge fee for receiver + bonus money
        if (dataTransaction.pay_transaction_fee === "DES") {
            // Check Balance after transfer is not zero or negative value
            if (desBankAccount.balance - TRANSFER_FEE + dataTransaction.transaction_amount <= 0) {
                return res.status(403).json({
                    isSuccess: false,
                    message: "Transaction failed! Balance is not enough for transfer"
                })
            }
            desBankAccount = {
                ...desBankAccount,
                balance: desBankAccount.balance - TRANSFER_FEE + dataTransaction.transaction_amount
            }
        } else {
            desBankAccount = {
                ...desBankAccount,
                balance: desBankAccount.balance + dataTransaction.transaction_amount
            }
        }

        // Update table Banking_account for balance updated
        await bankingAccountModel.genericMethods.update(srcBankAccount.account_number, srcBankAccount)
        await bankingAccountModel.genericMethods.update(desBankAccount.account_number, desBankAccount)

        // Update status is_success true for transaction table
        const newDataTransaction = { ...dataTransaction, is_success: true }
        await transactionModel.genericMethods.update(transactionId, newDataTransaction)

        // Get info des_account and src_account
        const infoDesUser = await userModel.genericMethods.findById(desBankAccount.user_id)
        const infoSrcUser = await userModel.genericMethods.findById(srcBankAccount.user_id)

        // Create info Transaction to send to client
        const infoTransaction = {
            full_name: infoDesUser.full_name,
            bank: "SOLAR BANKING",
            des_account_number: desBankAccount.account_number,
            transaction_amount: dataTransaction.transaction_amount,
            transaction_message: dataTransaction.transaction_message,
            transaction_fee: TRANSFER_FEE,
            total: TRANSFER_FEE + dataTransaction.transaction_amount
        }

        // Generate email send to src and des account_number
        const subject = "Transfer Money"
        const srcMessage = generateSrcTransfer(infoSrcUser.full_name, srcBankAccount.account_number
            , dataTransaction.transaction_amount, srcBankAccount.balance, dataTransaction.transaction_message,
            infoDesUser.email, dataTransaction.transaction_created_at)
        const desMessage = generateDesTransfer(infoDesUser.full_name, desBankAccount.account_number,
            dataTransaction.transaction_amount, desBankAccount.balance, dataTransaction.transaction_message,
            desBankAccount.email, dataTransaction.transaction_created_at)
        generateEmail(infoSrcUser.email, subject, srcMessage)
        generateEmail(infoDesUser.email, subject, desMessage)

        // Send to client inform transaction success
        return res.status(200).json({
            isSuccess: true,
            infoTransaction
        })

    } catch (err) {
        console.log(err)
        return res.status(500).json({
            isSuccess: false,
            message: "Can not confirm the transaction"
        })
    }
})

// Resend OTP
router.post("/transaction/:id/otp", async (req, res) => {
    const transactionId = req.params.id
    try {
        // Check transaction exist in database ( based on transactionId and not success)
        const dataTransaction = await transactionModel.findTransactionNotSuccessById(transactionId)
        if (dataTransaction === null) {
            return res.status(403).json({
                isSuccess: false,
                message: "Transaction has already completed"
            })
        }

        // Get full info of src and des account number
        const result = await transactionModel.findInfoTransaction(transactionId)
        if (result === null) {
            return res.status(403).json({
                isSuccess: false,
                message: "OTP can not be renew"
            })
        }

        const srcInfo = result[0]
        // Generate otp
        const otp = generateOtp()
        // update new otp code to transaction_table
        await transactionModel.genericMethods.update(transactionId, { ...dataTransaction, otp_code: otp })

        // Send otp to user through email
        const subject = "Transfer Money"
        const message = generateOtpContentTransfer(srcInfo.full_name, srcInfo.email, otp)
        generateEmail(srcInfo.email, subject, message)

        return res.status(200).json({
            isSuccess: true,
            message: "OTP has been renew"
        })
    } catch (err) {
        console.log(err)
        return res.status(500).json({
            isSuccess: false,
            message: "OTP Can not be resend"
        })
    }
})


// -------------------------------------- INTERBANK : LIEN NGAN HANG ---------------------------- //

// First step: Get des_full_info from other banks based on des_account_number
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

        // Check bank exist from database
        const bankInfo = await bankModel.genericMethods.findById(infoTransaction.bank_code)
        if(bankInfo === null || infoTransaction.bank_code ===BANK_CODE){
            return res.status(400).json({
                isSuccess:false,
                message:"Bank doesn't belongs to system connectivity banks"
            })
        }

        // Encrypt des_account_number by private key
        const token =await jwt.generateAsyncToken(infoTransaction.des_account_number,process.env.PRIVATE_KEY,EXPIRED_RSA_TIME)
        const infoVerification = {token:token,bank_code:"SLB"}

        // Sending des_account_number to other bank to query info
        const result = await axios({
            url:"http://localhost:3050/api/customers/desaccount",
            method:"GET",
            data:infoVerification
        })
        const result_des = result.data.infoRecipient

        return res.status(200).json({
            isSuccess: true,
            message: "Confirm transaction is valid",
            infoTransaction: { ...infoTransaction, 
                full_name: result_des.full_name,
                email:result_des.email,
                phone:result_des.phone,
                transaction_type: 2 }
        })


    } catch (err) {
        console.log(err)
        return res.status(500).json({
            isSuccess: false,
            message: "Can not confirm the transaction"
        })
    }
})

// First step: Receive account_number from other bank and query to send back to that bank
router.get("/desaccount",async(req,res)=>{
    const {token,bank_code} = req.body
    // Get public key based on bank_code from infoVerification
    const bankInfo = await bankModel.genericMethods.findById(bank_code)
    // Verify exactly other bank is send this message
    if(await jwt.verifyAsyncToken(token,bankInfo.public_key) === null){
        return res.status(403).json({
            isSuccess:false,
            message:"Can not verified token"
        })
    }
    // Decode token to get des_account_number
    const decodedInfo = await jwt.decodeAsyncToken(token)
    if(decodedInfo === null){
        return res.status(400).json({
            isSuccess:false,
            message:"Can not decode token"
        })
    }

    // Get info des_account_number
    const account_number = decodedInfo.payload.payload
    const infoRecipient = await bankingAccountModel.getInfoUserBy(account_number)
    if(infoRecipient===null){
        return res.status(400).json({
            isSuccess:false,
            message:"Can not find user by account number"
        })
    }
    // delete balance des_account_number before sending to other bank
    delete infoRecipient.balance

    return res.status(200).json({
        isSuccess:true,
        infoRecipient
    })
})

export default router