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
        const account_number = req.query.account_number;
        console.log(account_number)
        const userInfo = await bankingAccountModel.getInfoUserBy(account_number);
        if (userInfo !== null){
            let userResponse = {
                full_name: userInfo.full_name,
                email: userInfo.email,
                phone: userInfo.phone,
            }
            return res.status(200).json({
                isSuccess: true,
                userInfo: userResponse
            })
        }
        return res.status(500).json({
            isSuccess:false,
            message:"Can not find user info"
        })
    }catch (err){
        return res.status(400).json({
            isSuccess:false,
            message: err.message
        })
    }
})

export default router