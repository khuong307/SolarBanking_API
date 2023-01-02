import express from "express"
import transactionModel from "../models/transactions.model.js";
import { filterArray } from "../utils/array.js";
import {authRole, authUser} from "../middlewares/auth.mdw.js";
import role from '../utils/role.js';
const router = express.Router()

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

export default router