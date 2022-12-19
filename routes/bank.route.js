import express from "express"
import bankModel from "../models/bank.model.js"

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

export default router