/**
 * @swagger
 * tags:
 *   name: Customer Transaction
 *   description: API to handle transfer money such as intrabank and interbank transfer.
 * components:
 *   schemas:
 *     Transaction:
 *       type: object
 *       required:
 *         - src_account_number
 *         - des_account_number
 *         - transaction_amount
 *         - otp_code
 *         - pay_transaction_fee
 *         - is_success
 *         - transaction_type
 *       properties:
 *         src_account_number:
 *           type: string
 *           description: The account number of sender.
 *         des_account_number:
 *           type: string
 *           description: The account number of recipient.
 *         transaction_amount:
 *           type: integer
 *           description: The amount of money.
 *         otp_code:
 *           type: string
 *           description: A string is used to verify transfer.
 *         transaction_message:
 *           type: string
 *           description: message of a transaction.
 *         pay_transaction_fee:
 *           type: string
 *           description: type of transfer
 *         is_success:
 *           type: boolean
 *           description: status of transaction
 *         transaction_type:
 *           type: int
 *           description: type of transaction
 *       example:
 *          src_account_number: "11111"
 *          des_account_number: "22222"
 *          transaction_amount: 50000000
 *          otp_code: "345678"
 *          transaction_message: "Transfer money"
 *          pay_transaction_fee: "SRC"
 *          is_success: 1
 *          transaction_type: 1
 *     BankingAccount:
 *       type: object
 *       required:
 *         - account_number
 *         - user_id
 *         - bank_code
 *       properties:
 *         account_number:
 *           type: string
 *           description: The account number of user.
 *         balance:
 *           type: int
 *           description: The amount of money of an account.
 *         user_id:
 *           type: integer
 *           description: unique identify of a user.
 *         bank_code:
 *           type: string
 *           description: unique identify of a bank.
 *         is_spend_account:
 *           type: boolean
 *           description: status of bank account.
 *       example:
 *          account_number: "11111"
 *          balance: 50000000
 *          user_id: 1
 *          bank_code: "SLB"
 *          is_spend_account: 1
 */


import express from "express"
import md5 from "md5"
import moment from "moment"
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
import db from "../utils/db.js";


const router = express.Router()

/**
 * @swagger
 * /customers/{userId}/bankaccounts:
 *   get:
 *     summary: Find all bank accounts of a user
 *     tags: [Customer Transaction]
 *     parameters:
 *     - name: userId
 *       in: path
 *       description: User id to find bank account belong to this user
 *       required: true
 *       schema:
 *         type: integer
 *     responses:
 *       "200":
 *         description: Successfully get all bank accounts.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isSuccess:
 *                   type: boolean
 *                   description: The status
 *                 bankAccounts:
 *                   type: array
 *                   description: list of bank accounts of user
 *                   items:
 *                     $ref: '#/components/schemas/BankingAccount'
 *       "400":
 *         description: Unsuccessfully get all bank accounts.
 *         content:
 *           application/json:
 *             example:
 *               isSuccess: false
 *               message: "There is no bank account for this user"
 *       "500":
 *         description: Unsuccessfully get all bank accounts.
 *         content:
 *           application/json:
 *             example:
 *               isSuccess: false
 *               message: "Can not get bank accounts"
 */
router.get("/:userId/bankaccounts", validateParams, async (req, res) => {
    const userId = +req.params.userId
    try {
        const bankAccounts = await bankingAccountModel.findByUserIdAndAccountType(userId, 1)
        if (bankAccounts.length <= 0) {
            return res.status(400).json({
                isSuccess: false,
                message: "There is no bank account for this user"
            })
        }
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


/**
 * @swagger
 * /customers/{userId}/bankaccount:
 *   get:
 *     summary: Find bank SLB of a user
 *     tags: [Customer Transaction]
 *     parameters:
 *     - name: userId
 *       in: path
 *       description: User id to find bank account belong to this user
 *       required: true
 *       schema:
 *         type: integer
 *     responses:
 *       "200":
 *         description: Successfully get bank account.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isSuccess:
 *                   type: boolean
 *                   description: The status
 *                 bankAccount:
 *                   type: object
 *                   description: bank account of this user
 *             example:
 *                 isSuccess: true
 *                 bankAccount: {
 *                    account_number: "01325183",
 *                    balance: 121391300,
 *                    user_id: 40,
 *                    bank_code: "SLB",
 *                    is_spend_account: 1
 *                 }
 *       "400":
 *         description: Unsuccessfully get bank account.
 *         content:
 *           application/json:
 *             example:
 *               isSuccess: false
 *               message: "There is no bank account for this user"
 *       "500":
 *         description: Unsuccessfully get bank account.
 *         content:
 *           application/json:
 *             example:
 *               isSuccess: false
 *               message: "Can not get bank account"
 */
router.get("/:userId/bankaccount", validateParams, async (req, res) => {
    const userId = +req.params.userId
    try {
        const bankAccount = await bankingAccountModel.findByUserIdAndBankCode(userId)
        if (bankAccount === null) {
            return res.status(400).json({
                isSuccess: false,
                message: "There is no bank account for this user"
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

/**
 * @swagger
 * /customers/{userId}/intratransaction:
 *   post:
 *     summary: FIrst step - Check Info Intra Transaction Before Real Transfer
 *     tags: [Customer Transaction]
 *     parameters:
 *     - name: userId
 *       in: path
 *       description: User id to find bank account belong to this user
 *       required: true
 *       schema:
 *         type: integer
 *     requestBody:
 *       description: Info Transaction
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               src_account_number:
 *                 type: string
 *                 description: The bank account of sender.
 *               des_account_number:
 *                 type: string
 *                 description: The bank account of recipient.
 *               bank_code:
 *                 type: string
 *                 description: The code of bank's recipient
 *               transaction_amount:
 *                 type: int
 *                 description: The amount of money transfer
 *               transaction_message:
 *                 type: string
 *                 description: The message of transaction
 *               pay_transaction_fee:
 *                 type: string
 *                 description: Type of transaction
 *           example:
 *             src_account_number: "11111"
 *             des_account_number: "01325183"
 *             bank_code: "SLB"
 *             transaction_amount: 500000
 *             transaction_message: "Transfer Money"
 *             pay_transaction_fee: "SRC"
 *     responses:
 *       "200":
 *         description: Confirm information transaction is valid.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isSuccess:
 *                   type: boolean
 *                   description: The status
 *                 message:
 *                   type: string
 *                   description: Confirm transaction is valid                 
 *                 infoTransaction:
 *                   type: object
 *                   description: information of transaction includes recipient information
 *             example:
 *                 isSuccess: true
 *                 message: "Confirm transaction is valid"
 *                 infoTransaction: {
 *                    src_account_number: "11111",
 *                    des_account_number: "01325183",
 *                    bank_code: "SLB",
 *                    transaction_amount: 500000,
 *                    transaction_message: "Transfer Money",
 *                    pay_transaction_fee: "SRC",
 *                    full_name: "Lam Thanh Hong",
 *                    email: "hong8877@gmail.com",
 *                    phone: "1902445452",
 *                    transaction_type: 1
 *                 }
 *       "400":
 *         description: Valid Intra Transaction failed.
 *         content:
 *           application/json:
 *             examples:
 *               Money transaction invalid:
 *                 value:
 *                   isSuccess: false
 *                   message: "Money transaction is invalid"
 *               Not existed src_account_number:
 *                 value:
 *                   isSuccess: false
 *                   message: "source account number is invalid"
 *               Not existed des_account_number:
 *                 value:
 *                   isSuccess: false
 *                   message: "destination account number is invalid"
 *       "500":
 *         description: Invalid Information Intra Transaction.
 *         content:
 *           application/json:
 *             example:
 *               isSuccess: false
 *               message: "Can not confirm the transaction"
 */

// FIrst step : Check Info Inter Transaction Before Real Transfer
router.post("/:userId/intratransaction", validateParams, async (req, res) => {
    const infoTransaction = req.body
    const userId = +req.params.userId
    try {
        // Check src_account_number is existed (belong to userId)
        const result_src = await bankingAccountModel.findByUserIdAndAccountNumber(userId, infoTransaction.src_account_number)
        if (result_src.length === 0) {
            return res.status(400).json({
                isSuccess: false,
                message: "source account number is invalid"
            })
        }
        // Check amount of money is valid corresponding to account_number
        if (infoTransaction.transaction_amount > result_src[0].balance) {
            return res.status(400).json({
                isSuccess: false,
                message: "Money transaction is invalid"
            })
        }

        // Check des_account_number is existed
        const result_des = await bankingAccountModel.findByAccountNumberAndBankCode(infoTransaction.des_account_number, infoTransaction.bank_code)
        if (result_des.length === 0) {
            return res.status(400).json({
                isSuccess: false,
                message: "destination account number is invalid"
            })
        }

        // if des_account_number existed, query to get user's full name of des_account_number
        const result_user_des = await userModel.genericMethods.findById(result_des[0].user_id)

        return res.status(200).json({
            isSuccess: true,
            message: "Confirm transaction is valid",
            infoTransaction: {
                ...infoTransaction,
                full_name: result_user_des.full_name,
                email: result_user_des.email,
                phone: result_user_des.phone,
                transaction_type: 1
            }
        })
    } catch (err) {
        console.log(err)
        return res.status(500).json({
            isSuccess: false,
            message: "Can not confirm the transaction"
        })
    }
})

/**
 * @swagger
 * /customers/{userId}/transaction/confirm:
 *   post:
 *     summary: Second step - Confirm information transaction ( used for both intrabank and interbank)
 *     tags: [Customer Transaction]
 *     parameters:
 *     - name: userId
 *       in: path
 *       description: User id to find user information belong to this user
 *       required: true
 *       schema:
 *         type: integer
 *     requestBody:
 *       description: Info Transaction
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               src_account_number:
 *                 type: string
 *                 description: The bank account of sender.
 *               des_account_number:
 *                 type: string
 *                 description: The bank account of recipient.
 *               transaction_amount:
 *                 type: int
 *                 description: The amount of money transfer
 *               transaction_message:
 *                 type: string
 *                 description: The message of transaction
 *               pay_transaction_fee:
 *                 type: string
 *                 description: Type of transaction fee
 *               transaction_type:
 *                 type: int
 *                 description: Type of transaction
 *           example:
 *             src_account_number: "11111"
 *             des_account_number: "01325183"
 *             transaction_amount: 500000
 *             transaction_message: "Transfer Money"
 *             pay_transaction_fee: "SRC"
 *             transaction_type: 1
 *     responses:
 *       "200":
 *         description: Confirm information transaction is valid.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isSuccess:
 *                   type: boolean
 *                   description: The status of confirm transaction.
 *                 transactionId:
 *                   type: int
 *                   description: The id of transaction
 *             example:
 *               isSuccess: true
 *               transactionId: 1
 *       "400":
 *         description: Valid Intra Transaction failed.
 *         content:
 *           application/json:
 *             example:
 *               isSuccess: false
 *               message: "Money transaction is invalid"
 *       "500":
 *         description: Invalid Information Intra Transaction.
 *         content:
 *           application/json:
 *             example:
 *               isSuccess: false
 *               message: "Can not confirm the transaction"
 */

// ---------- DUNG CHO CA LIEN NGAN HANG VA NOI BO --------------------- //
// Second step: Confirm transaction after all info is correct 
router.post("/:userId/transaction/confirm", validateParams, async (req, res) => {
    const userId = +req.params.userId
    const infoTransaction = req.body
    try {
        // Check amount money transfer is valid before initialize otp ( prevent hacker)
        const srcBankAccount = await bankingAccountModel.genericMethods.findById(infoTransaction.src_account_number)
        // Check amount of money is valid corresponding to account_number
        if (infoTransaction.transaction_amount > srcBankAccount.balance) {
            return res.status(400).json({
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

/**
 * @swagger
 * /customers/intratransaction/{id}:
 *   post:
 *     summary: Final step - Intra transaction Valid OTP and Transaction completed 
 *     tags: [Customer Transaction]
 *     parameters:
 *     - name: id
 *       in: path
 *       description: id belongs to a transaction
 *       required: true
 *       schema:
 *         type: integer
 *     requestBody:
 *       description: Information OTP
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               otpCode:
 *                 type: string
 *                 description: 6 digits verification for a transaction.
 *               created_at:
 *                 type: string
 *                 description: timestamp send otp to server
 *           example:
 *             otpCode: "324789"
 *             created_at: "2023-01-04 09:43:00"
 *     responses:
 *       "200":
 *         description: Confirm OTP is valid.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isSuccess:
 *                   type: boolean
 *                   description: The status of confirm transaction.
 *                 infoTransaction:
 *                   type: object
 *                   description: The information of a transaction
 *             example:
 *               isSuccess: true
 *               infoTransaction: {
 *                 isSavedRecipientTable: true,
 *                 full_name: "Lam Thanh Hong",
 *                 des_account_number: "01325183",
 *                 bank: "SOLAR BANKING",
 *                 transaction_amount: 500000,
 *                 transaction_message: "Transfer Money",
 *                 transaction_fee: 15000,
 *                 total: 515000
 *               }
 *       "403":
 *         description: Transaction failed.
 *         content:
 *           application/json:
 *             examples:
 *               Invalid transaction:
 *                 value:
 *                   isSuccess: false
 *                   message: Transaction has already completed
 *               Expired OTP Code:
 *                 value:
 *                   isSuccess: false
 *                   message: Transaction failed! OTP Code is expired
 *               Wrong amount of money transaction:
 *                 value:
 *                   isSuccess: false
 *                   message: Transaction failed! Balance is not enough for transfer
 *       "500":
 *         description: Invalid Information Intra Transaction.
 *         content:
 *           application/json:
 *             example:
 *               isSuccess: false
 *               message: "Can not confirm the transaction"
 */

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

        const otpSendTime = datetime_func.convertStringToDate(otpInfo.created_at)
        const otpCreatedTime = datetime_func.convertStringToDate(dataTransaction.transaction_created_at)
        const diff = datetime_func.diff_minutes(otpSendTime, otpCreatedTime)

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

        // Check des_account_number is saved to table recipient
        const isSavedRecipientTable = await recipientModel.checkExistByUserIdAndAccountNumber(srcBankAccount.user_id, desBankAccount.account_number)

        // Create info Transaction to send to client
        const infoTransaction = {
            isSavedRecipientTable,
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

/**
 * @swagger
 * /customers/transaction/{id}/otp:
 *   post:
 *     summary: Resend OTP of a transaction ( used for both intrabank and interbank) 
 *     tags: [Customer Transaction]
 *     parameters:
 *     - name: id
 *       in: path
 *       description: id belongs to a transaction
 *       required: true
 *       schema:
 *         type: integer
 *     responses:
 *       "200":
 *         description: Successfully Resend OTP.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isSuccess:
 *                   type: boolean
 *                   description: The status of confirm transaction.
 *                 message:
 *                   type: string
 *                   description: The information of OTP Resend
 *             example:
 *               isSuccess: true
 *               message: OTP has been renew
 *       "403":
 *         description: Resend OTP failed.
 *         content:
 *           application/json:
 *             examples:
 *               Invalid transaction:
 *                 value:
 *                   isSuccess: false
 *                   message: Transaction has already completed
 *               Invalid Email Sender:
 *                 value:
 *                   isSuccess: false
 *                   message: OTP can not be renew because can't find src_information
 *       "500":
 *         description: Resend OTP failed.
 *         content:
 *           application/json:
 *             example:
 *               isSuccess: false
 *               message: "OTP Can not be resend"
 */

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
                message: "OTP can not be renew because can't find src_information"
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

/**
 * @swagger
 * /customers/{userId}/intertransaction:
 *   post:
 *     summary: FIrst step - Check Info Inter Transaction + Get des_account_number information
 *     tags: [Customer Transaction]
 *     parameters:
 *     - name: userId
 *       in: path
 *       description: User id to find bank account belong to a user
 *       required: true
 *       schema:
 *         type: integer
 *     requestBody:
 *       description: Info Transaction
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               src_account_number:
 *                 type: string
 *                 description: The bank account of sender.
 *               des_account_number:
 *                 type: string
 *                 description: The bank account of recipient.
 *               bank_code:
 *                 type: string
 *                 description: The code of bank's recipient
 *               transaction_amount:
 *                 type: int
 *                 description: The amount of money transfer
 *               transaction_message:
 *                 type: string
 *                 description: The message of transaction
 *               pay_transaction_fee:
 *                 type: string
 *                 description: Type of transaction
 *           example:
 *             src_account_number: "11111"
 *             des_account_number: "23875338674"
 *             bank_code: "TXB"
 *             transaction_amount: 500000
 *             transaction_message: "Transfer Money"
 *             pay_transaction_fee: "SRC"
 *     responses:
 *       "200":
 *         description: Confirm information transaction is valid.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isSuccess:
 *                   type: boolean
 *                   description: The status
 *                 message:
 *                   type: string
 *                   description: Confirm transaction is valid                 
 *                 infoTransaction:
 *                   type: object
 *                   description: information of transaction includes recipient information
 *             example:
 *                 isSuccess: true
 *                 message: "Confirm transaction is valid"
 *                 infoTransaction: {
 *                    src_account_number: "11111",
 *                    des_account_number: "23875338674",
 *                    bank_code: "TXB",
 *                    transaction_amount: 500000,
 *                    transaction_message: "Transfer Money",
 *                    pay_transaction_fee: "SRC",
 *                    full_name: "Customer Name",
 *                    email: "",
 *                    phone: "",
 *                    transaction_type: 2
 *                 }
 *       "400":
 *         description: Valid Inter Transaction failed.
 *         content:
 *           application/json:
 *             examples:
 *               Invalid Bank:
 *                 value:
 *                   isSuccess: false
 *                   message: Bank doesn't belongs to system connectivity banks
 *               Money transaction invalid:
 *                 value:
 *                   isSuccess: false
 *                   message: Money transaction is invalid
 *               Not existed src_account_number:
 *                 value:
 *                   isSuccess: false
 *                   message: source account number is invalid
 *               Not existed des_account_number:
 *                 value:
 *                   isSuccess: false
 *                   message: destination account number is invalid
 *       "500":
 *         description: Invalid Information Inter Transaction.
 *         content:
 *           application/json:
 *             example:
 *               isSuccess: false
 *               message: Can not confirm the transaction
 */

// First step: Get des_full_info from other banks based on des_account_number
router.post("/:userId/intertransaction", validateParams, async (req, res) => {
    const infoTransaction = req.body
    const userId = +req.params.userId
    // Using trx as a transaction object:
    const trx = await db.transaction();
    try {
        // Check src_account_number is existed (belong to userId)
        const result_src = await bankingAccountModel.findByUserIdAndAccountNumber(userId, infoTransaction.src_account_number)
        if (result_src.length === 0) {
            return res.status(400).json({
                isSuccess: false,
                message: "source account number is invalid"
            })
        }

        // Check amount of money is valid corresponding to account_number
        if (infoTransaction.transaction_amount > result_src[0].balance) {
            return res.status(400).json({
                isSuccess: false,
                message: "Money transaction is invalid"
            })
        }

        // Check bank exist from database
        const bankInfo = await bankModel.genericMethods.findById(infoTransaction.bank_code)
        if (bankInfo === null || infoTransaction.bank_code === BANK_CODE) {
            return res.status(400).json({
                isSuccess: false,
                message: "Bank doesn't belongs to system connectivity banks"
            })
        }


        // Prepare data to send to other bank to get info des_account_number
        const payload = {
            accountNumber: infoTransaction.des_account_number,
            slug: BANK_CODE
        }
        let data = JSON.stringify(payload)
        const timestamp = Date.now()
        // Encrypt des_account_number by private key
        const msgToken = md5(timestamp + data + process.env.SECRET_KEY)
        const infoVerification = {
            accountNumber: infoTransaction.des_account_number,
            timestamp: timestamp,
            msgToken: msgToken,
            slug: BANK_CODE
        }

        // Sending des_account_number to other bank to query info
        const result = await axios({
            url: "http://ec2-3-80-72-113.compute-1.amazonaws.com:3001/accounts/external/get-info",
            method: "POST",
            data: infoVerification
        })
        const result_des = result.data.data.user

        let des_user_id = -1
        // Check des user is not existed in db
        if (!await userModel.checkExistByFullName(result_des.name)) {
            const newUser = {
                full_name: result_des.name,
                email: "",
                phone: ""
            }
            des_user_id = await trx("user").insert(newUser)
        }

        // Check banking account existed in db
        if (await bankingAccountModel.genericMethods.findById(infoTransaction.des_account_number) === null) {
            // Add new banking account to db
            const newBankAccount = {
                account_number: infoTransaction.des_account_number,
                balance: 0,
                user_id: des_user_id[0],
                bank_code: infoTransaction.bank_code,
                is_spend_account: 1
            }
            await trx("banking_account").insert(newBankAccount)
        }

        await trx.commit()

        return res.status(200).json({
            isSuccess: true,
            message: "Confirm transaction is valid",
            infoTransaction: {
                ...infoTransaction,
                full_name: result_des.name,
                email: "",
                phone: "",
                transaction_type: 2
            }
        })


    } catch (err) {
        await trx.rollback()
        console.log(err)
        return res.status(500).json({
            isSuccess: false,
            message: "Can not confirm the transaction"
        })
    }
})

/**
 * @swagger
 * /customers/desaccount:
 *   get:
 *     summary: Receive account_number from other bank and query to send back to that bank
 *     tags: [Customer Transaction]
 *     requestBody:
 *       description: Info Transaction
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 description: information des_account_numer encrypted.
 *               bank_code:
 *                 type: string
 *                 description: The bank of sender ( other bank).
 *           example:
 *             token: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXlsb2FkIjp7ImRlc19hY2NvdW50X251bWJlciI6IjExMTExIiwiZGVzX2JhbmtfY29kZSI6IlNMQiJ9LCJpYXQiOjE2NzI4MDM0ODIsImV4cCI6MTY3MjkwMzQ4Mn0.KXtrhcOK6G_-l_YpwFGy_hysw-G4SdTCvmzKrLyQ5ld7_qDOPeV0hnzP6-fgbwMDU21JON0ySwIO-2G5kAKKIME_GBuD9S-eQ7OY5yZY8tfQB_-ExQhuRR_0bkS4clIc-FTVkrkIsSlauYH72_6ULhhH0DHO9R5C0nrOtKEDVxc"
 *             bank_code: "TXB"
 *     responses:
 *       "200":
 *         description: Successfully get bank account information.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isSuccess:
 *                   type: boolean
 *                   description: The status of get information bank account                
 *                 infoRecipient:
 *                   type: object
 *                   description: information of recipient ( our bank)
 *             example:
 *                 isSuccess: true
 *                 infoRecipient: {
 *                    user_id: "40",
 *                    full_name: "Lam Thanh Hong",
 *                    email: "hong8877@gmail.com",
 *                    phone: "1902445452",
 *                 }
 *       "400":
 *         description: Invalid Request Get Information Destination Account.
 *         content:
 *           application/json:
 *             examples:
 *               Invalid Bank:
 *                 value:
 *                   isSuccess: false
 *                   message: Bank doesn't belongs to system connectivity banks
 *               Decode Token Failed:
 *                 value:
 *                   isSuccess: false
 *                   message: Can not decode token
 *               Not existed des_account_number:
 *                 value:
 *                   isSuccess: false
 *                   message: Can not find user by account number
 *       "401":
 *         description: Invalid Token.
 *         content:
 *           application/json:
 *             example:
 *               isSuccess: false
 *               message: Can not verified token
 *       "500":
 *         description: Invalid Getting Destination User Information.
 *         content:
 *           application/json:
 *             example:
 *               isSuccess: false
 *               message: Can not get the information of user
 */

// Receive account_number from other bank and query to send back to that bank
router.get("/desaccount", async (req, res) => {
    const { token, bank_code } = req.body
    try {
        // Get public key based on bank_code from infoVerification
        const bankInfo = await bankModel.genericMethods.findById(bank_code)

        // Check other bank is exist in database
        if (bankInfo === null) {
            return res.status(400).json({
                isSuccess: false,
                message: "Bank doesn't belongs to system connectivity banks"
            })
        }

        console.log(bankInfo)
        // Verify exactly other bank is send this message
        if (await jwt.verifyAsyncToken(token, bankInfo.public_key, EXPIRED_RSA_TIME) === null) {
            return res.status(401).json({
                isSuccess: false,
                message: "Can not verified token"
            })
        }
        // Decode token to get des_account_number
        const decodedInfo = await jwt.decodeAsyncToken(token)
        if (decodedInfo === null) {
            return res.status(400).json({
                isSuccess: false,
                message: "Can not decode token"
            })
        }

        console.log(decodedInfo)

        // Get info des_account_number
        const account_number = decodedInfo.payload.payload.des_account_number
        const des_bank_code = decodedInfo.payload.payload.des_bank_code

        // Check des_account_number existed based on account number and bank code
        if (!await bankingAccountModel.checkExistBy(account_number, des_bank_code)) {
            return res.status(400).json({
                isSuccess: false,
                message: "Can not find user by account number"
            })
        }

        const infoRecipient = await bankingAccountModel.getInfoUserBy(account_number)
        if (infoRecipient === null) {
            return res.status(400).json({
                isSuccess: false,
                message: "Can not find user by account number"
            })
        }
        // delete balance des_account_number before sending to other bank
        delete infoRecipient.balance

        return res.status(200).json({
            isSuccess: true,
            infoRecipient
        })
    } catch (err) {
        console.log(err)
        return res.status(500).json({
            isSuccess: false,
            message: "Can not get the information of user"
        })
    }
})

// Final Step: Valid OTP and Transaction completed
router.post("/intertransaction/:id", async (req, res) => {
    const transactionId = req.params.id
    const otpInfo = req.body
    // Using trx as a transaction object:
    const trx = await db.transaction();
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


        const otpSendTime = datetime_func.convertStringToDate(otpInfo.created_at)
        const otpCreatedTime = datetime_func.convertStringToDate(dataTransaction.transaction_created_at)
        const diff = datetime_func.diff_minutes(otpSendTime, otpCreatedTime)

        // Otp failed or time valid for otp is expired 
        if (otpInfo.otpCode !== dataTransaction.otp_code || diff > 5) {
            return res.status(403).json({
                isSuccess: false,
                message: "Transaction failed! OTP Code is expired"
            })
        }

        // Query bank account of src
        let srcBankAccount = await bankingAccountModel.genericMethods.findById(dataTransaction.src_account_number)
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


        // Get info src
        const infoSrcUser = await userModel.genericMethods.findById(srcBankAccount.user_id)
        // Combine all info src,transaction to prepare send to other bank
        const infoSendOtherBank = { ...dataTransaction, ...infoSrcUser }
        delete infoSendOtherBank.balance

        // Encrypt info before send to other bank
        const token = await jwt.generateAsyncToken(infoSendOtherBank, process.env.PRIVATE_KEY, EXPIRED_RSA_TIME)
        const encryptedData = { token, bank_code: "SLB" }

        const desEncryptedInfo = await axios({
            url: "http://localhost:3050/api/customers/intertransaction",
            method: "GET",
            data: encryptedData
        })

        const { encryptToken, bank_code } = desEncryptedInfo.data.encryptedData
        // Get public key based on bank_code from infoVerification
        const bankInfo = await bankModel.genericMethods.findById(bank_code)
        console.log(bankInfo)
        // Check other bank is exist in database
        if (bankInfo === null) {
            return res.status(400).json({
                isSuccess: false,
                message: "Bank doesn't belongs to system connectivity banks"
            })
        }

        // Verify exactly other bank is send this message
        if (await jwt.verifyAsyncToken(encryptToken, bankInfo.public_key, EXPIRED_RSA_TIME) === null) {
            return res.status(403).json({
                isSuccess: false,
                message: "Can not verified token"
            })
        }

        // Decode token to get des_account_number
        const decodedInfo = await jwt.decodeAsyncToken(encryptToken)
        if (decodedInfo === null) {
            return res.status(400).json({
                isSuccess: false,
                message: "Can not decode token"
            })
        }

        const infoDesUser = decodedInfo.payload.payload

        // Update table Banking_account for balance updated
        await trx("banking_account").where({ account_number: srcBankAccount.account_number }).update(srcBankAccount)

        // Update status is_success true for transaction table
        const newDataTransaction = { ...dataTransaction, is_success: true }
        await trx("transaction").where({ transaction_id: transactionId }).update(newDataTransaction)

        await trx.commit()

        let isSavedRecipientTable = false
        // Check des_account_number is saved to table recipient
        const resultRecipient = await recipientModel.checkExistByUserIdAndAccountNumber(srcBankAccount.user_id, dataTransaction.des_account_number)
        if (resultRecipient === null) {
            isSavedRecipientTable = false
        } else {
            isSavedRecipientTable = true
        }
        // Create info Transaction to send to client
        const infoTransaction = {
            isSavedRecipientTable,
            full_name: infoDesUser.full_name,
            bank: bankInfo.bank_name,
            des_account_number: dataTransaction.des_account_number,
            transaction_amount: dataTransaction.transaction_amount,
            transaction_message: dataTransaction.transaction_message,
            transaction_fee: TRANSFER_FEE,
            total: TRANSFER_FEE + dataTransaction.transaction_amount
        }

        // Generate email send to src  ( email of des will be in charge of other bank)
        const subject = "Transfer Money"
        const srcMessage = generateSrcTransfer(infoSrcUser.full_name, srcBankAccount.account_number
            , dataTransaction.transaction_amount, srcBankAccount.balance, dataTransaction.transaction_message,
            infoDesUser.email, dataTransaction.transaction_created_at)
        generateEmail(infoSrcUser.email, subject, srcMessage)

        // Send to client inform transaction success
        return res.status(200).json({
            isSuccess: true,
            infoTransaction
        })

    } catch (err) {
        await trx.rollback()
        console.log(err)
        return res.status(500).json({
            isSuccess: false,
            message: "Can not confirm the transaction"
        })
    }
})


// -------------- IN CASE RECEIVE MONEY FROM OTHER BANKS FINAL STEP ------------------------------//

/**
 * @swagger
 * /customers/intertransaction:
 *   get:
 *     summary: Receive money from other bank ( intertransaction)
 *     tags: [Customer Transaction]
 *     requestBody:
 *       description: Information Transaction
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 description: information transaction encrypted.
 *               bank_code:
 *                 type: string
 *                 description: The bank of sender ( other bank).
 *           example:
 *             token: "string"
 *             bank_code: "TXB"
 *     responses:
 *       "200":
 *         description: Successfully transaction.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isSuccess:
 *                   type: boolean
 *                   description: The status of get information bank account
 *                 message:
 *                   type: string
 *                   description: Confirm Transaction is completed                
 *                 encryptedData:
 *                   type: object
 *                   description: information of des_account_number ( our bank) encrypted
 *             example:
 *                 isSuccess: true
 *                 message: Transaction completed
 *                 encryptedData: {
 *                    encryptToken: "string",
 *                    bank_code: "SLB"
 *                 }
 *       "400":
 *         description: Invalid Request Transaction.
 *         content:
 *           application/json:
 *             examples:
 *               Invalid Bank:
 *                 value:
 *                   isSuccess: false
 *                   message: Bank doesn't belongs to system connectivity banks
 *               Decode Token Failed:
 *                 value:
 *                   isSuccess: false
 *                   message: Can not decode token
 *               Not existed des_account_number:
 *                 value:
 *                   isSuccess: false
 *                   message: Account doesn't exist
 *               Invalid balance of des_account_number:
 *                 value:
 *                   isSuccess: false
 *                   message: Transaction failed! Balance is not enough for transfer
 *       "401":
 *         description: Invalid Token.
 *         content:
 *           application/json:
 *             example:
 *               isSuccess: false
 *               message: Can not verified token
 *       "500":
 *         description: Invalid Transaction.
 *         content:
 *           application/json:
 *             example:
 *               isSuccess: false
 *               message: Can not done the transaction
 */

router.get("/intertransaction", async (req, res) => {
    const { token, bank_code } = req.body
    console.log(req.body)
    console.log(token)
    console.log(bank_code)
    // Get public key based on bank_code from infoVerification
    const bankInfo = await bankModel.genericMethods.findById(bank_code)
    // Check other bank is exist in database
    if (bankInfo === null) {
        return res.status(400).json({
            isSuccess: false,
            message: "Bank doesn't belongs to system connectivity banks"
        })
    }

    // Verify exactly other bank is send this message
    if (await jwt.verifyAsyncToken(token, bankInfo.public_key, EXPIRED_RSA_TIME) === null) {
        return res.status(401).json({
            isSuccess: false,
            message: "Can not verified token"
        })
    }

    // Decode token to get des_account_number
    const decodedInfo = await jwt.decodeAsyncToken(token)
    if (decodedInfo === null) {
        return res.status(400).json({
            isSuccess: false,
            message: "Can not decode token"
        })
    }

    console.log("decodeInfo: ", decodedInfo)

    const infoReceive = decodedInfo.payload.infoTransaction
    console.log("infoReceive: ", infoReceive)
    const newUser = {
        full_name: infoReceive?.full_name,
        email: infoReceive?.email,
        phone: infoReceive?.phone
    }
    const newBankAccount = {
        account_number: infoReceive?.src_account_number,
        balance: 0,
        user_id: infoReceive?.user_id,
        bank_code,
        is_spend_account: 1
    }


    // Using trx as a transaction object:
    const trx = await db.transaction();
    try {
        let desInfo = await bankingAccountModel.getInfoUserBy(infoReceive?.des_account_number)
        if (desInfo === null) {
            return res.status(400).json({
                isSuccess: false,
                message: "Account doesn't exist"
            })
        }

        // Find account_number receive money
        let recipientAccount = await bankingAccountModel.genericMethods.findById(infoReceive?.des_account_number)
        if (recipientAccount === null) {
            return res.status(400).json({
                isSuccess: false,
                message: "Account doesn't exist"
            })
        }

        // If Paid By Receiver => Charge fee for receiver + bonus money
        if (infoReceive.pay_transaction_fee === "DES") {
            // Check Balance after transfer is not zero or negative value
            if (recipientAccount.balance - TRANSFER_FEE + infoReceive.transaction_amount <= 0) {
                return res.status(403).json({
                    isSuccess: false,
                    message: "Transaction failed! Balance is not enough for transfer"
                })
            }
            recipientAccount = {
                ...recipientAccount,
                balance: recipientAccount.balance - TRANSFER_FEE + infoReceive.transaction_amount
            }
        } else {
            recipientAccount = {
                ...recipientAccount,
                balance: recipientAccount.balance + infoReceive.transaction_amount
            }
        }

        console.log(recipientAccount)

        let src_user_id = -1
        // Check src user is not existed in db
        if (!await userModel.checkExistBy(infoReceive.full_name, infoReceive.email, infoReceive.phone)) {
            const newUser = {
                full_name: infoReceive.full_name,
                email: infoReceive.email,
                phone: infoReceive.phone
            }
            src_user_id = await trx("user").insert(newUser)
            console.log(src_user_id)
        }

        // Check src banking account existed in db
        if (await bankingAccountModel.genericMethods.findById(infoReceive.src_account_number) === null) {
            // Add new banking account to db
            const newBankAccount = {
                account_number: infoReceive.src_account_number,
                balance: 0,
                user_id: src_user_id[0],
                bank_code: bank_code,
                is_spend_account: 1
            }
            console.log(newBankAccount)
            await trx("banking_account").insert(newBankAccount)
        }

        // Update balance of account
        const result = await trx("banking_account").where({ account_number: infoReceive.des_account_number })
            .update(recipientAccount)

        // delete attribute sent by other bank
        delete infoReceive?.transaction_id
        delete infoReceive?.user_id
        delete infoReceive?.full_name
        delete infoReceive?.email
        delete infoReceive?.phone
        // Add new transaction to db
        await trx("transaction").insert({ ...infoReceive, is_success: 1 })

        delete desInfo.balance
        // Encrypt data to send back to other bank
        desInfo = {...desInfo,des_account_number:infoReceive?.des_account_number}
        const encryptToken = await jwt.generateAsyncToken(desInfo, process.env.PRIVATE_KEY, EXPIRED_RSA_TIME)
        const encryptedData = { encryptToken, bank_code: "SLB" }

        await trx.commit()
        console.log(result)

        return res.status(200).json({
            isSuccess: true,
            message: "Transaction completed",
            encryptedData
        })
    } catch (err) {
        await trx.rollback()
        console.log(err)
        res.status(500).json({
            isSuccess: false,
            message: "Can not done the transaction"
        })
    }
})


/**
 * @swagger
 * /customers/save:
 *   post:
 *     summary: Save recipient to recipient list of user
 *     tags: [Customer Transaction]
 *     requestBody:
 *       description: Information Recipient
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: int
 *                 description: unique identifier of user.
 *               account_number:
 *                 type: string
 *                 description: The bank account of recipient.
 *               nick_name:
 *                 type: string
 *                 description: Short name of recipient
 *           example:
 *             user_id: 1
 *             account_number: 01325183
 *             nick_name: Hong
 *     responses:
 *       "200":
 *         description: Successfully save recipient.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isSuccess:
 *                   type: boolean
 *                   description: The status of get information bank account
 *                 message:
 *                   type: string
 *                   description: Save recipient is completed                
 *                 result:
 *                   type: int
 *                   description: id of new recipient in recipient list
 *             example:
 *                 isSuccess: true
 *                 message: Save recipient successfully!
 *                 result: 1
 *       "500":
 *         description: Invalid Save Recipient.
 *         content:
 *           application/json:
 *             example:
 *               isSuccess: false
 *               message: Can not save recipient
 */

// Save recipient to recipient list
router.post("/save", async (req, res) => {
    const infoRecipient = req.body
    try {
        let result = -1
        const recipient = await recipientModel.checkExistByUserIdAndAccountNumber(infoRecipient.user_id, infoRecipient.account_number)
        // Check account_number exist in db => if exist update nick_name, otherwise add to db
        if (recipient === null) {
            result = await recipientModel.genericMethods.add(infoRecipient)
        } else {
            result = await recipientModel.updateNickNameByUserIdAndAccountNumber(infoRecipient.user_id, infoRecipient.account_number, infoRecipient.nick_name)
        }
        return res.status(200).json({
            isSuccess: true,
            message: "Save recipient successfully!",
            result
        })
    } catch (err) {
        console.log(err)
        return res.status(500).json({
            isSuccess: false,
            message: "Can not save recipient"
        })
    }

})


export default router