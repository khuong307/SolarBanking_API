/**
 * @swagger
 * tags:
 *   name: Employee
 *   description: API to handle Customer's Request, supports Employee
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
import bcrypt from 'bcrypt'
import { readFile } from 'fs/promises';
import * as dotenv from "dotenv";

import userModel from "../models/user.model.js";
import userAccountModel from "../models/user-account.model.js";
import banking_accountModel from "../models/banking-account.model.js";
import transactionModel from "../models/transaction.model.js";
import mail from "../utils/mail.js";
import role from '../utils/role.js';
import {
    balanceToInt,
    generateContent,
    generateAccount,
    generateTransfer,
    filterTransactionByTypeAndDes,
    generateRefreshToken
} from '../utils/bank.js'
import validate from '../middlewares/validate.mdw.js';
import {authRole, authUser} from "../middlewares/auth.mdw.js";


dotenv.config();

const newCustomerSchema = JSON.parse(await readFile(new URL('../schemas/new_customer.json', import.meta.url)));
const customerListSchema = JSON.parse(await readFile(new URL('../schemas/customer_list.json', import.meta.url)))
const transferEmployee = JSON.parse(await readFile(new URL('../schemas/employee_transfer.json', import.meta.url)))
const router = express.Router();

/**
 * @swagger
 * /employee/customer/{accessInfo}:
 *   get:
 *     summary: Get information of a customer base on account number / username.
 *     tags: [Employee]
 *     parameters:
 *     - name: accessInfo
 *       in: path
 *       description: Customer information (account_number, username)
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
 *               $ref: "#/components/schemas/BankingAccount"
 *             example:
 *                isFound: true
 *                message: "Success"
 *                customer_info: {
 *                         full_name: "Nguyen Vu Duy Khuong",
 *                         email: "duykhuong3072001@gmail.com",
 *                         phone: "0903024916",
 *                         account_number: "203391882",
 *                         balance: 1000000
 *                     }
 *       "209":
 *         description: Wrong information of customer.
 *         content:
 *           application/json:
 *             example:
 *               message: 'Account number or Username does not exist!'
 *       "401":
 *         description: Unauthorized user
 *         content:
 *           application/json:
 *             example:
 *               message: Unauthorized user!
 *       "500":
 *         description: Sever Interal Error
 *         content:
 *           application/json:
 *             example:
 *               message: Sever Interal Error
 */
router.get('/customer/:accessInfo', authUser, async function (req, res) {
    const {accessInfo} = req.params
    const isBankAccount = await banking_accountModel.genericMethods.findByCol("account_number", accessInfo)
    const isUsername = await userAccountModel.genericMethods.findByCol("username", accessInfo)
    var spendAccountInfo = ""
    if (isUsername != null ){
        spendAccountInfo = await banking_accountModel.genericMethods.findBy2ColMany("user_id", isUsername.user_id, "is_spend_account", 1)
    }
    const bankAccountInfo = isBankAccount != null ?
        isBankAccount: isUsername != null ?
            spendAccountInfo[0]:
            null

    if (bankAccountInfo != null){
        const userInfo = await userModel.genericMethods.findById(bankAccountInfo.user_id)
        const customer_info = {
            full_name: userInfo.full_name,
            email: userInfo.email,
            phone: userInfo.phone,
            account_number: bankAccountInfo.account_number,
            balance: bankAccountInfo.balance
        }
        return res.status(200).json({
            isFound: true,
            customer_info,
            message: "Success"
        })
    }

    return res.status(209).json({
        isFound: false,
        message: "Account number or Username does not exist!"
    })

});

/**
 * @swagger
 * /employee/customer/{account_number}:
 *  post:
 *     summary: Charge money for a customer by giving account_number
 *     tags: [Employee]
 *     parameters:
 *     - name: account_number
 *       in: path
 *       description: Customer information (account_number)
 *       required: true
 *       schema:
 *         type: string
 *     - name: amount
 *       in: body
 *       description: Amount of money wabt to charge
 *       required: true
 *       schema:
 *         type: integer
 *     - name: message
 *       in: body
 *       description: Message when charge money
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
 *               $ref: "#/components/schemas/BankingAccount"
 *             example:
 *                isFound: true
 *                transaction_info: {
 *                      time: "2022-12-01",
 *                      transaction_message: "Transfer Money SLB",
 *                      account_number: "203391882",
 *                      new_balance: 1000000,
 *                      email: "duykhuong3072001@gmail.com",
 *                      customer_fullname: "Nguyen Vu Duy Khuong"
 *                  }
 *       "209":
 *         description: Wrong information of customer.
 *         content:
 *           application/json:
 *             example:
 *               message: 'Account number does not exist!'
 *       "401":
 *         description: Unauthorized user
 *         content:
 *           application/json:
 *             example:
 *               message: Unauthorized user!
 *       "500":
 *         description: Sever Interal Error
 *         content:
 *           application/json:
 *             example:
 *               message: Sever Interal Error
 */
router.post('/customer/:account_number',  authUser, authRole(role.EMPLOYEE), validate(transferEmployee), async function (req, res) {
    const {account_number} = req.params
    const amount = parseInt(req.body.amount.replaceAll(',',''))
    const message = req.body.message
    const bankAccountInfo = await banking_accountModel.genericMethods.findByCol("account_number", account_number)
    if (bankAccountInfo != null){
        bankAccountInfo.balance += amount
        await banking_accountModel.genericMethods.update(account_number, bankAccountInfo)

        //save transfer
        const newRecord = {
            src_account_number: 'SLB',
            des_account_number: account_number,
            transaction_amount: amount,
            otp_code: "000000",
            transaction_message: message,
            pay_transaction_fee: 0,
            is_success: true,
            transaction_type: 1
        }
        const newTransaction = await transactionModel.genericMethods.add(newRecord)
        const customer_info = await userModel.genericMethods.findById(bankAccountInfo.user_id)
        //mail
        const email_content = generateTransfer(customer_info.full_name, account_number, req.body.amount,bankAccountInfo.balance, message,  customer_info.email)
        mail(customer_info.email, "[SOLAR BANKING] [Transaction Information]", email_content)
        // //notification
        // const newNoti = {
        //     user_id: customer_info.user_id,
        //     transaction_id: newTransaction,
        //     notification_message: message,
        //     is_seen: 0,
        // }
        // await notificationModel.genericMethods.add(newNoti)

        return res.status(200).json({
            isFound: true,
            transaction_info : {
                time: new Date().toISOString(),
                transaction_message: message,
                account_number: account_number,
                new_balance: bankAccountInfo.balance,
                email: customer_info.email,
                customer_fullname: customer_info.full_name
            }
        })
    }

    return res.status(209).json({
        isFound: false,
        message: "Account number does not exist!"
    })

});

/**
 * @swagger
 * /employee/customer:
 *  post:
 *     summary: Create one new customer.
 *     tags: [Employee]
 *     parameters:
 *     - name: full_name
 *       in: body
 *       description: Customer's Full name
 *       required: true
 *       schema:
 *         type: string
 *     - name: phone
 *       in: body
 *       description: Customer phone number
 *       required: true
 *       schema:
 *         type: string
 *     - name: email
 *       in: body
 *       description: Customer email
 *       required: true
 *       schema:
 *         type: string
 *     - name: username
 *       in: body
 *       description: Customer username when login
 *       required: true
 *       schema:
 *         type: string
 *     - name: password
 *       in: body
 *       description: Customer password (hash with bcrypt)
 *       required: true
 *       schema:
 *         type: string
 *     - name: spend_account
 *       in: body
 *       description: Account Number (System auto generated(
 *       required: true
 *       schema:
 *         type: string
 *     - name: initial_balance
 *       in: body
 *       description: Intial balance of customer want to have.
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
 *               $ref: "#/components/schemas/BankingAccount"
 *             example:
 *                  - success: true
 *                    message: "Created new customer."
 *                    customer_info: {
 *                      full_name: "Nguyen Vu Duy Khuong",
 *                      email: "duykhuong3072001@gmail.com",
 *                      phone: "0903024916",
 *                      username: "kolgo",
 *                      hashPassword: "@213213dfasdwe1231231wasadawq"
*                     }
 *       "409":
 *         description: Wrong information of customer.
 *         content:
 *           application/json:
 *             example:
 *               - message: 'Account number does not exist!'
 *                 success: false,
 *       "401":
 *         description: Unauthorized user
 *         content:
 *           application/json:
 *             example:
 *               message: Unauthorized user!
 *       "500":
 *         description: Sever Interal Error
 *         content:
 *           application/json:
 *             example:
 *               message: Sever Interal Error
 */
router.post('/customer', authUser, authRole(role.EMPLOYEE), validate(newCustomerSchema), async function (req, res) {
    const {full_name, email, phone, username, password, spend_account, initial_balance } = req.body
    const isEmailExisted = await userModel.genericMethods.isExistedByCol("email", email)
    const isUsernameExited = await userAccountModel.genericMethods.isExistedByCol("username", username)
    if(isEmailExisted == true || isUsernameExited == true){
        res.status(409).json({
          success: false,
          message: "This email or using has already been used!"
        })
    }
    if (isEmailExisted == false && isUsernameExited == false){
        const hashPassword = bcrypt.hashSync(password, 10)
        const newUser = {full_name, email, phone}
        const newUserAccount = {username, password: hashPassword, user_type_id: 1, refresh_token: generateRefreshToken()}
        const newBankingAccount = {account_number: spend_account, balance: balanceToInt(initial_balance), bank_code: "SLB"}

        //add to new Database
        newUserAccount.user_id = await userModel.genericMethods.add(newUser)
        newBankingAccount.user_id = newUserAccount.user_id
        await userAccountModel.genericMethods.add(newUserAccount)
        await banking_accountModel.genericMethods.add(newBankingAccount)

        const email_content = generateContent(full_name, username, email, password, spend_account, initial_balance)
        mail(email, "[SOLAR BANKING] [CUSTOMER INFORMATION]", email_content)

        res.status(200).json({
            success: true,
            message: "Created new customer.",
            customer_info: {
                full_name,
                email,
                phone,
                username,
                hashPassword
            }
        })
    }
});

/**
 * @swagger
 * /employee/customers:
 *  post:
 *     summary: Create many new customers.
 *     tags: [Employee]
 *     parameters:
 *     - name: full_name
 *       in: body
 *       description: Customer's Full name
 *       required: true
 *       schema:
 *         type: string
 *     - name: phone
 *       in: body
 *       description: Customer phone number
 *       required: true
 *       schema:
 *         type: string
 *     - name: email
 *       in: body
 *       description: Customer email
 *       required: true
 *       schema:
 *         type: string
 *     - name: username
 *       in: body
 *       description: Customer username when login
 *       required: true
 *       schema:
 *         type: string
 *     - name: password
 *       in: body
 *       description: Customer password (hash with bcrypt)
 *       required: true
 *       schema:
 *         type: string
 *     - name: spend_account
 *       in: body
 *       description: Account Number (System auto generated(
 *       required: true
 *       schema:
 *         type: string
 *     - name: initial_balance
 *       in: body
 *       description: Intial balance of customer want to have.
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
 *               $ref: "#/components/schemas/BankingAccount"
 *             example:
 *                  - success_array: [{
 *                      username: "kolgo",
 *                      id: 1,
 *                      email: "duykhuong3072001@gmail.com"
 *                  }, {
 *                      username: "ngoclam",
 *                      id: 2,
 *                      email: "ngoclam99@gmail.com"
 *                  }]
 *                    fail_array: [{
 *                      username: "chinchin00",
 *                      id: 3,
 *                      email: "trungchinh99@gmail.com"
 *                    }]
 *       "409":
 *         description: Wrong information of customer.
 *         content:
 *           application/json:
 *             example:
 *               - message: 'Account number does not exist!'
 *                 success: false,
 *       "401":
 *         description: Unauthorized user
 *         content:
 *           application/json:
 *             example:
 *               message: Unauthorized user!
 *       "500":
 *         description: Sever Interal Error
 *         content:
 *           application/json:
 *             example:
 *               message: Sever Interal Error
 */
router.post('/customers',authUser, authRole(role.EMPLOYEE), validate(customerListSchema), async function (req, res) {
    const successArray = []
    const failArray = []
    let countS = 0
    let countF = 0

    for (const customer of req.body){
        const {full_name, email, phone, username, password, initial_balance } = customer
        const isEmailExisted = await userModel.genericMethods.isExistedByCol("email", email)
        const isUsernameExited = await userAccountModel.genericMethods.isExistedByCol("username", username)
        if(isEmailExisted == true || isUsernameExited == true){
            failArray.push({
                username,
                email,
                id: countF++
            })
        }
        if (isEmailExisted == false && isUsernameExited == false){
            const hashPassword = bcrypt.hashSync(password, 10)
            const spend_account = await generateAccount()

            const newUser = {full_name, email, phone}
            const newUserAccount = {username, password: hashPassword, user_type_id: 1}
            const newBankingAccount = {account_number: spend_account, balance: balanceToInt(initial_balance), bank_code: "SLB"}

            //add to new Database
            newUserAccount.user_id = await userModel.genericMethods.add(newUser)
            newBankingAccount.user_id = newUserAccount.user_id
            await userAccountModel.genericMethods.add(newUserAccount)
            await banking_accountModel.genericMethods.add(newBankingAccount)
            //send -email
            const email_content = generateContent(full_name, username, email, password, spend_account, initial_balance)
            mail(email, "[SOLAR BANKING] [CUSTOMER INFORMATION]", email_content)
            successArray.push({
                username,
                email,
                id: countS++

            })
        }
    }
    res.status(200).json({
        success_array: successArray,
        fail_array: failArray,
    })
});

/**
 * @swagger
 * /employee/bank_account:
 *  get:
 *     summary: Auto generate a new account number for new custoemr.
 *     tags: [Employee]
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
 *     responses:
 *       "200":
 *         description: Successful operation.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/BankingAccount"
 *             example:
 *                  - account_number: "348837126"
 *                    success: true
 *       "401":
 *         description: Unauthorized user
 *         content:
 *           application/json:
 *             example:
 *               message: Unauthorized user!
 *       "500":
 *         description: Sever Interal Error
 *         content:
 *           application/json:
 *             example:
 *               message: Sever Interal Error
 */
router.get('/bank_account' ,authUser, authRole(role.EMPLOYEE),  async function(req, res){
    var account = await generateAccount()
    res.status(200).json({
        success: true,
        spend_account: account
    })
})

//transaction
/**
 * @swagger
 * /employee/customer//transaction/{accessInfo}:
 *   get:
 *     summary: Get information of a customer base on account number / username.
 *     tags: [Employee]
 *     parameters:
 *     - name: accessInfo
 *       in: path
 *       description: Customer information (account_number, username)
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
 *               $ref: "#/components/schemas/BankingAccount"
 *             example:
 *                isFound: true
 *                transfer_list_by_customer: [{
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
*                  },{
 *                      transaction_id: 82,
 *                      src_account_number: '28069884',
 *                      des_account_number: '71873611',
 *                      transaction_amount: 1000000,
 *                      transaction_message: 'Li xi nam moi Happy New Year',
 *                      pay_transaction_fee: 'SRC',
 *                      is_success: 1,
 *                      transaction_created_at: 2023-01-01T11:22:00.000Z,
 *                      transaction_type: 1,
 *                      other_fullname: 'Lam Bao Ngoc'
 *                  }]
 *                paid_debt_list: []
 *                recevied_debt_list: []
 *                charge_by_SLB: []
 *                received_from_others: []
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
 *       "500":
 *         description: Sever Interal Error
 *         content:
 *           application/json:
 *             example:
 *               message: Sever Interal Error
 */
router.get('/customer/transactions/:accessInfo', authUser, authRole(role.EMPLOYEE), async function(req, res){
    const paraData = req.params.accessInfo
    const isBankAccount = await banking_accountModel.genericMethods.findByCol("account_number", paraData)
    const isUsername = await userAccountModel.genericMethods.findByCol("username", paraData)
    const bankAccountInfo = isBankAccount != null ?
        isBankAccount: isUsername != null ?
            await banking_accountModel.genericMethods.findByCol("user_id", isUsername.user_id) :
            null
    if (bankAccountInfo == null){
        return res.status(209).json({
            isFound: false,
            message: "Not found this customer base on account number or username!"
        })
    }else{
        const accessInfo = bankAccountInfo.account_number
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

})

export default router;