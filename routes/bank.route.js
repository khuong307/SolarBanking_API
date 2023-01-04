import express from "express"
import bankModel from "../models/bank.model.js"
import bankingAccountModel from "../models/banking-account.model.js";

const router = express.Router()

router.get("/",async(req,res)=>{
    try{
        const bankList = await bankModel.genericMethods.findAll()
        res.status(200).json({
            isSuccess:true,
            bankList
        })
    }catch(err){
        console.log(err)
        res.status(500).json({
            isSuccess:false,
            message:"Can not get bank list"
        })
    }
})

//get info user by account number
router.get("/infoUser",async function(req,res){
    try{
        const account_number = req.body.account_number;
        const userInfo = await bankingAccountModel.getInfoRecipientBy(account_number);
        if (userInfo){
            let userResponse = {
                full_name: userInfo[0].full_name,
                email: userInfo[0].email,
                phone: userInfo[0].phone,
            }
            res.status(200).json({
                isSuccess: true,
                userInfo: userResponse
            })
        }
        res.status(500).json({
            isSuccess:false,
            message:"Can not get user info"
        })
    }catch (err){
        res.status(400).json({
            isSuccess:false,
            message: err.message
        })
    }
})

export default router