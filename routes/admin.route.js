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

//router.get("/transactions", authUser, authorization(role.ADMIN), async(req,res)=>{
router.get("/transactions", async(req,res)=>{
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
                return new Date(start_date) < transaction_date;
            });
        }
        if (end_date) {
            transactionList = transactionList.filter(function(element) {
                var transaction_date = new Date(element.transaction_created_at)
                return transaction_date < new Date(end_date);
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

// router.get("/employees", authUser, authorization(role.ADMIN), async(req,res)=>{
router.get("/employees", async(req,res)=>{
    try{
        const employeeList = await userModel.findAllUser(role.EMPLOYEE)
        res.status(200).json({
            isSuccess:true,
            employeeList
        })
    }catch(err){
        console.log(err)
        res.status(500).json({
            isSuccess: false,
            message:"Can not get employee list"
        })
    }
})

// router.delete("/employee/:id", authUser, authorization(role.ADMIN), async (req,res)=>{
router.delete("/employee/:id", async (req,res)=>{
    try{
        const employeeId = req.params.id
        var firstResponse = await userAccountModel.deleteUserAccount(employeeId)
        var secondResponse = await userModel.genericMethods.delete(employeeId)
        res.status(200).json({
            isSuccess:true,
            message:"Delete employee successfully"
        })
    }catch(err){
        console.log(err)
        res.status(500).json({
            isSuccess: false,
            message:"Delete employee unsuccessfully"
        })
    }
})

// router.post('/employee', authUser, authorization(role.ADMIN), validate(employeeSchema), async function (req, res) {
router.post('/employee', validate(employeeSchema), async function (req, res) {
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

        res.status(200).json({
            success: true,
            message: "Create new employee successfully",
        })
    } catch (e) {
        console.log(e)
        res.status(500).json({
            isSuccess: false,
            message:"Cannot create new employee"
        })
    }
    
});

// router.put('/employee/:userId', authUser, authorization(role.ADMIN), validate(userSchema), async function(req, res) {
router.patch('/employee/:userId', validateParams, validate(employeeSchema), async function(req, res) {
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
            message:"Cannot update employee infomation"
        })
    }
});

// router.get('/employee/:userId', authUser, authorization(role.ADMIN), validate(userSchema), async function(req, res) {
router.get('/employee/:userId', async function(req, res) {
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
            message:"Cannot update employee infomation"
        })
    }
});
export default router