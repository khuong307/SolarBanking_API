import express from "express"
import bankingAccountModel from "../models/banking-account.model.js"
import recipientModel from "../models/recipient.model.js"

const router = express.Router()

// Get Source bank ( render to select option in front end)
router.get("/bank/:id",async(req,res)=>{
    try{
        const id = req.params.id
        const bankAccounts = await bankingAccountModel.findByUserIdAndAccountType(id,1)
        res.status(200).json({
            isSuccess:true,
            bankAccounts
        })
    }catch(err){
        console.log(err)
        res.status(500),json({
            isSuccess:false,
            message:"Can not get bank accounts"
        })
    }
})

// Get recipient list
router.get("/recipient/:id",async (req,res)=>{
    try{
        const id = req.params.id
        const recipientList = await recipientModel.getAllRecipientBankList(id)
        res.status(200).json({
            isSuccess:true,
            recipientList
        })
    }catch(err){
        console.log(err)
        res.status(500),json({
            isSuccess:false,
            message:"Can not get recipient list"
        })
    }
})

export default router