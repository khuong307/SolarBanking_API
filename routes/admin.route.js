import express from "express"
import transactionModel from "../models/transactions.model.js";
import { filterArray } from "../utils/array.js";
import {authorization, authRole, authUser} from "../middlewares/auth.mdw.js";
import role from '../utils/role.js';
import userModel from "../models/user.model.js";
import userAccountModel from "../models/user-account.model.js";
import {
    generateRefreshToken
} from '../utils/bank.js'
import { readFile } from 'fs/promises';
import validate, {validateParams} from '../middlewares/validate.mdw.js';
import bcrypt from 'bcrypt'

const userSchema = JSON.parse(await readFile(new URL('../schemas/user.json', import.meta.url)));
const employeeSchema = JSON.parse(await readFile(new URL('../schemas/employee.json', import.meta.url)));

const router = express.Router()

/**
 * @swagger
 * /admin/transactions:
 *   get:
 *     summary: Get transactions base on query params.
 *     tags: [Admin]
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
 *     - name: isExternal
 *       in: header
 *       description: External transaction or internal transaction
 *       schema:
 *         type: boolean
 *     - name: start_date
 *       in: header
 *       description: The minimum start date of all transactions
 *       schema:
 *         type: string
 *     - name: end_date
 *       in: header
 *       description: The maximum end date of all transactions
 *       schema:
 *         type: string
 *     - name: selected_bank
 *       in: header
 *       description: The bank code of transaction banks
 *       schema:
 *         type: string
 *     - name: offset
 *       in: header
 *       description: The offset of all transactions
 *       schema:
 *         type: string
 *     - name: limit
 *       in: header
 *       description: The limit of all transactions
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
 *                   description: The get status
 *                 transactionList:
 *                   type: object
 *                   properties:
 *                     transaction_id:
 *                       type: integer
 *                       description: The transaction id
 *                     src_account_number:
 *                       type: string
 *                       description: Source account number
 *                     src_bank_name:
 *                       type: string
 *                       description: Name of source bank
 *                     src_bank_code:
 *                       type: string
 *                       description: Code of source bank
 *                     des_account_number:
 *                       type: string
 *                       description: Destined account number
 *                     des_bank_name:
 *                       type: integer
 *                       description: Name of destined bank
 *                     des_bank_code:
 *                       type: integer
 *                       description: Code of destined bank
 *                     transaction_amount:
 *                       type: string
 *                       description: The amount of transaction
 *                     transaction_message:
 *                       type: integer
 *                       description: The message of transaction
 *                     pay_transaction_fee:
 *                       type: integer
 *                       description: The transaction fee
 *                     transaction_created_at:
 *                       type: integer
 *                       description: The transaction time
 *                     transaction_type_name:
 *                       type: integer
 *                       description: The transaction type
 *                     is_success:
 *                       type: integer
 *                       description: The status of transaction
 *             examples:
 *               Get successfully:
 *                 value:
 *                   "isSuccess": true
 *                   "transactionList": [
 *                       {
 *                           "transaction_id": 1001,
 *                           "src_account_number": "AN0001",
 *                           "src_bank_name": "Vietcombank",
 *                           "src_bank_code": "BK0001",
 *                           "des_account_number": "BA0002",
 *                           "des_bank_name": "MBBank",
 *                           "des_bank_code": "BK0002",
 *                           "transaction_amount": 500000,
 *                           "transaction_message": "",
 *                           "pay_transaction_fee": "SRC",
 *                           "transaction_created_at": "2022-12-24T09:14:21.000Z",
 *                           "transaction_type_name": "transfer",
 *                           "is_success": 1
 *                       }
 *                   ]
 *               Get new access token:
 *                 value:
 *                   accessToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXlsb2FkIjoibnNuaGFuIiwiaWF0IjoxNjcyNTU5NTUxLCJleHAiOjE2NzI1NjAxNTF9.9dtX_GD4xQxuJ59Rw7fQFKds4fTJe0bSr4LcjHYyDvw
 *       "500":
 *         description: Server Internal Error
 *         content:
 *           application/json:
 *             example:
 *                "isSuccess": false
 *                "message": "Can not get transaction list"
 */
router.get("/transactions", authUser, authorization(role.ADMIN), async(req,res)=>{
    var is_external = req.headers.is_external ? req.headers.is_external === 'true' : true;
    var start_date = req.headers.start_date;
    var end_date = req.headers.end_date;
    var selected_bank = req.headers.selected_bank;
    var offset = req.headers.offset;
    var limit = req.headers.limit;
    var totalTransactionAmount = 0;
    try{
        var transactionList = await transactionModel.getTransactionList(is_external);
        transactionList = transactionList.filter(function(element) {
            return is_external ? element.src_bank_code !== element.des_bank_code 
                : element.src_bank_code === element.des_bank_code;
        });
        if (start_date) {
            transactionList = transactionList.filter(function(element) {
                var transaction_date = new Date(element.transaction_created_at)
                return new Date(start_date) <= transaction_date;
            });
        }
        if (end_date) {
            transactionList = transactionList.filter(function(element) {
                var transaction_date = new Date(element.transaction_created_at)
                var date = new Date(end_date)
                return transaction_date <= date.setDate(date.getDate() + 1);
            });
        }
        if (selected_bank) {
            transactionList = transactionList.filter(function(element) {
                return element.src_bank_code === selected_bank || element.des_bank_code === selected_bank;
            });
        }
        transactionList.forEach(function(element) {
            totalTransactionAmount += element.transaction_amount;
        });
        if (offset || limit) {
            transactionList = filterArray(transactionList, offset, limit);
        }
        res.status(200).json({
            isSuccess:true,
            transactionList,
            totalTransactionAmount
        })
    }catch(err){
        console.log(err)
        res.status(500).json({
            isSuccess:false,
            message:"Can not get transaction list"
        })
    }
})
/**
 * @swagger
 * /admin/employees:
 *   get:
 *     summary: Get all employee.
 *     tags: [Admin]
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
 *               type: object
 *               properties:
 *                 isSuccess:
 *                   type: boolean
 *                   description: The get status
 *                 employeeList:
 *                   type: object
 *                   properties:
 *                     user_id:
 *                       type: integer
 *                       description: The user id of employee
 *                     full_name:
 *                       type: string
 *                       description: The full name of employee
 *                     email:
 *                       type: string
 *                       description: The email of employee
 *                     phone:
 *                       type: string
 *                       description: The phone number of employee
 *                     username:
 *                       type: string
 *                       description: The username of employee
 *             examples:
 *               Get successfully:
 *                 value:
 *                   "isSuccess": true
 *                   "employeeList": [
 *                       {
 *                           "user_id": 7,
 *                           "full_name": "nguyen 021",
 *                           "email": "nguyen@yopmail.com",
 *                           "phone": "098765426",
 *                           "username": "nguyen222"
 *                       }
 *                   ]
 *               Get new access token:
 *                 value:
 *                   accessToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXlsb2FkIjoibnNuaGFuIiwiaWF0IjoxNjcyNTU5NTUxLCJleHAiOjE2NzI1NjAxNTF9.9dtX_GD4xQxuJ59Rw7fQFKds4fTJe0bSr4LcjHYyDvw
 *       "500":
 *         description: Server Internal Error
 *         content:
 *           application/json:
 *             example:
 *                "isSuccess": false
 *                "message": "Can not get employee list"
 */
router.get("/employees", authUser, authorization(role.ADMIN), async(req,res)=>{
    try{
        const employeeList = await userModel.findAllUser(role.EMPLOYEE)
        return res.status(200).json({
            isSuccess: true,
            employeeList
        })
    }catch(err){
        console.log(err)
        return res.status(500).json({
            isSuccess: false,
            message:"Can not get employee list"
        })
    }
})
/**
 * @swagger
 * /admin/employee/{id}:
 *   delete:
 *     summary: Delete employee with specify user id.
 *     tags: [Admin]
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
 *     - name: id
 *       in: path
 *       description: The user id of emmployee that need to be deleted
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
 *                   description: The status of api
 *                 message:
 *                   type: string
 *             examples:
 *               Delete successfully:
 *                 value:
 *                   "isSuccess": true
 *                   "message": "Delete employee successfully"
 *               Get new access token:
 *                 value:
 *                   accessToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXlsb2FkIjoibnNuaGFuIiwiaWF0IjoxNjcyNTU5NTUxLCJleHAiOjE2NzI1NjAxNTF9.9dtX_GD4xQxuJ59Rw7fQFKds4fTJe0bSr4LcjHYyDvw
 *       "500":
 *         description: Server Internal Error
 *         content:
 *           application/json:
 *             example:
 *                "isSuccess": false
 *                "message": "Delete employee unsuccessfully"
 */
router.delete("/employee/:id", authUser, authorization(role.ADMIN), async (req,res)=>{
    try{
        const employeeId = req.params.id
        var firstResponse = await userAccountModel.deleteUserAccount(employeeId)
        var secondResponse = await userModel.genericMethods.delete(employeeId)
        res.status(200).json({
            isSuccess:true,
            message: "Delete employee successfully"
        })
    }catch(err){
        console.log(err)
        res.status(500).json({
            isSuccess: false,
            message: "Delete employee unsuccessfully"
        })
    }
})
/**
 * @swagger
 * /admin/employee:
 *   post:
 *     summary: Create new employee.
 *     tags: [Admin]
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
 *     requestBody:
 *       description: Notification ids info
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - full_name
 *               - email
 *               - phone
 *               - username
 *             properties:
 *               full_name:
 *                 type: string
 *                 description: The id array of notification which is unseen
 *               email:
 *                 type: string
 *                 description: The id array of notification which is unseen
 *               phone:
 *                 type: string
 *                 description: The id array of notification which is unseen
 *               username:
 *                 type: string
 *                 description: The id array of notification which is unseen
 *               password:
 *                 type: string
 *                 description: The id array of notification which is unseen
 *               confirmPassword:
 *                 type: string
 *                 description: The id array of notification which is unseen
 *           example:
 *              "full_name": "test002"
 *              "email": "test002@yopmail.com"
 *              "phone": "0987654321"
 *              "username": "test002"
 *              "password": "test002"
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
 *                   description: The get status
 *                 message:
 *                   type: string
 *             examples:
 *               Post successfully:
 *                 value:
 *                   "isSuccess": true
 *                   "message": "Create employee successfully"
 *               Get new access token:
 *                 value:
 *                   accessToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXlsb2FkIjoibnNuaGFuIiwiaWF0IjoxNjcyNTU5NTUxLCJleHAiOjE2NzI1NjAxNTF9.9dtX_GD4xQxuJ59Rw7fQFKds4fTJe0bSr4LcjHYyDvw
 *       "500":
 *         description: Server Internal Error
 *         content:
 *           application/json:
 *             example:
 *                "isSuccess": false
 *                "message": "Create employee unsuccessfully"
 */
router.post('/employee', authUser, authorization(role.ADMIN), validate(employeeSchema), async function (req, res) {
    const {full_name, email, phone, username, password} = req.body
    try {
        const isEmailExisted = await userModel.genericMethods.isExistedByCol("email", email)
        const isUsernameExited = await userAccountModel.genericMethods.isExistedByCol("username", username)
        if(isEmailExisted == true || isUsernameExited == true){
            res.status(409).json({
                isSuccess: false,
                message: "This email or username has already been used!"
            })
        }
        const hashPassword = bcrypt.hashSync(password, 10)
        const newUser = {full_name, email, phone}
        const newUserAccount = {username, password: hashPassword, user_type_id: 2, refresh_token: generateRefreshToken()}

        newUserAccount.user_id = await userModel.genericMethods.add(newUser)
        await userAccountModel.genericMethods.add(newUserAccount)

        return res.status(200).json({
            isSuccess: true,
            message: "Create new employee successfully",
        })
    } catch (e) {
        console.log(e)
        return res.status(500).json({
            isSuccess: false,
            message:"Cannot create new employee"
        })
    }
    
});
/**
 * @swagger
 * /admin/employee/{userId}:
 *   patch:
 *     summary: Update infomation of employee.
 *     tags: [Admin]
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
 *     - name: userId
 *       in: header
 *       description: User id of employee that need to be updated
 *       schema:
 *         type: string
 *     requestBody:
 *       description: Notification ids info
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - full_name
 *               - email
 *               - phone
 *               - username
 *             properties:
 *               full_name:
 *                 type: string
 *                 description: The id array of notification which is unseen
 *               email:
 *                 type: string
 *                 description: The id array of notification which is unseen
 *               phone:
 *                 type: string
 *                 description: The id array of notification which is unseen
 *               username:
 *                 type: string
 *                 description: The id array of notification which is unseen
 *               password:
 *                 type: string
 *                 description: The id array of notification which is unseen
 *               confirmPassword:
 *                 type: string
 *                 description: The id array of notification which is unseen
 *           example:
 *              "full_name": "test002"
 *              "email": "test002@yopmail.com"
 *              "phone": "0987654321"
 *              "username": "test002"
 *              "password": "test002"
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
 *                   description: The get status
 *                 message:
 *                   type: string
 *             examples:
 *               Patch successfully:
 *                 value:
 *                   "isSuccess": true
 *                   "message": "Update employee infomation successfully"
 *               Get new access token:
 *                 value:
 *                   accessToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXlsb2FkIjoibnNuaGFuIiwiaWF0IjoxNjcyNTU5NTUxLCJleHAiOjE2NzI1NjAxNTF9.9dtX_GD4xQxuJ59Rw7fQFKds4fTJe0bSr4LcjHYyDvw
 *       "400":
 *         description: Bad Request
 *         content:
 *           application/json:
 *             example:
 *                "isSuccess": false
 *                "message": "Cannot find this employee"
 *       "500":
 *         description: Server Internal Error
 *         content:
 *           application/json:
 *             example:
 *                "isSuccess": false
 *                "message": "Cannot update employee infomation"
 */
router.patch('/employee/:userId', authUser, authorization(role.ADMIN), validateParams, validate(employeeSchema), async function(req, res) {
    try {
        const userId = +req.params.userId; 
        const updatedInfo = req.body;
        const updatedUserInfo = {
            full_name: updatedInfo.full_name,
            email: updatedInfo.email,
            phone: updatedInfo.phone
        }
        
        const user = await userModel.genericMethods.findById(userId);
        const userAccount = await userAccountModel.findByUserId(userId);
        if (user == null || userAccount == null || userAccount.user_type_id != 2) {
            return res.status(400).json({
                isSuccess: false,
                message: 'Cannot find this employee'
            });
        }
        if (updatedInfo && Object.keys(updatedInfo).length === 0 && Object.getPrototypeOf(updatedInfo) === Object.prototype) {
            return res.status(400).json({
                isSuccess: false,
                message: 'The request body must not be empty'
            });
        }

        await userModel.genericMethods.update(userId, updatedUserInfo);
        if (updatedInfo.password != "" && updatedInfo.password == updatedInfo.confirmPassword) {
            const hashPassword = bcrypt.hashSync(updatedInfo.password, 10)
            const newUserAccount = {username: updatedInfo.username, password: hashPassword, user_type_id: 2, refresh_token: generateRefreshToken()}
            await userAccountModel.genericMethods.update(updatedInfo.username, newUserAccount);
        }
        
        return res.status(200).json({
            isSuccess: true,
            message: "Update employee infomation successfully"
        });
    } catch (err) {
        res.status(500).json({
            isSuccess: false,
            message: "Cannot update employee infomation"
        })
    }
});
/**
 * @swagger
 * /admin/employee/{userId}:
 *   get:
 *     summary: Get infomation of employee
 *     tags: [Admin]
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
 *     - name: userId
 *       in: header
 *       description: User id of employee that need to be get infomation
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
 *                   description: The get status
 *                 properties:
 *                   full_name:
 *                      type: string
 *                      description: The full name of employee
 *                   email:
 *                      type: string
 *                      description: The email of employee
 *                   phone:
 *                      type: string
 *                      description: The phone number of employee
 *                   username:
 *                      type: string
 *                      description: The username of employee
 *                   password:
 *                      type: string
 *                      description: The password of employee
 *                   confirmPassword:
 *                      type: string
 *                      description: The confirm password of employee
 *             examples:
 *               Get successfully:
 *                 value:
 *                   "isSuccess": true
 *                   "user": {
 *                      "full_name": "test002",
 *                      "email": "test002@yopmail.com",
 *                      "phone": "0987654321",
 *                      "username": "test002",
 *                      "password": "test002"
 *                   }
 *               Get new access token:
 *                 value:
 *                   accessToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXlsb2FkIjoibnNuaGFuIiwiaWF0IjoxNjcyNTU5NTUxLCJleHAiOjE2NzI1NjAxNTF9.9dtX_GD4xQxuJ59Rw7fQFKds4fTJe0bSr4LcjHYyDvw
 *       "400":
 *         description: Bad Request
 *         content:
 *           application/json:
 *             example:
 *                "isSuccess": false
 *                "message": "Cannot find this employee"
 *       "500":
 *         description: Server Internal Error
 *         content:
 *           application/json:
 *             example:
 *                "isSuccess": false
 *                "message": "Cannot get employee infomation"
 */
router.get('/employee/:userId', authUser, authorization(role.ADMIN), async function(req, res) {
    try {
        const userId = +req.params.userId; 
        const user = await userModel.genericMethods.findById(userId);
        const userAccount = await userAccountModel.findByUserId(userId);
        if (user == null || userAccount == null || userAccount.user_type_id != 2) {
            return res.status(400).json({
                isSuccess: false,
                message: 'Cannot find this employee'
            });
        }
        const newUser = {
            user_id: user.user_id,
            full_name: user.full_name,
            email: user.email,
            phone: user.phone,
            username: userAccount.username
        }
    
        return res.status(200).json({
            isSuccess: true,
            user: newUser
        });
    } catch (err) {
        console.log(err)
        res.status(500).json({
            isSuccess: false,
            message:"Cannot get employee infomation"
        })
    }
});
export default router