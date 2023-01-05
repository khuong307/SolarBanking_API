import express from "express"
import transactionModel from "../models/transactions.model.js";
import { filterArray } from "../utils/array.js";
import {authorization, authRole, authUser} from "../middlewares/auth.mdw.js";
import role from '../utils/role.js';
import userModel from "../models/user.model.js";
import userAccountModel from "../models/user-account.model.js";
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
export default router