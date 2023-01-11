/**
 * @swagger
 * tags:
 *   name: Banks
 *   description: API to handle features and information belonging to Bank.
 * components:
 *   schemas:
 *     Bank:
 *       type: object
 *       properties:
 *         bank_code:
 *           type: string
 *           description: The code of bank.
 *         bank_name:
 *           type: string
 *           description: Name of the bank corresponding to the code.
 *         public_key:
 *           type: string
 *           description: The key is provided by partner.
 *         encoding_type:
 *           type: string
 *           description: A string determine a method to connect with partner (RSA or PGP).
 *       example:
 *          bank_code: "SLB"
 *          bank_name: "Solar Bank"
 *          public_key: "abc"
 *          encoding_type: "RSA"
 */
import express from "express"
import bankModel from "../models/bank.model.js"
import bankingAccountModel from "../models/banking-account.model.js";

const router = express.Router()


/**
 * @swagger
 * /banks/:
 *   get:
 *     summary: Get all banks
 *     tags: [Banks]
 *     responses:
 *       "200":
 *         description: Successful operation.
 *         content:
 *           application/json:
 *             examples:
 *               Get successfully:
 *                 value:
 *                   isSuccess: true
 *                   bankList:
 *                   - bank_code: "SLB"
 *                     bank_name: "Solar Bank"
 *                     public_key: "oijf932"
 *                     encoding_type: "RSA"
 *                   - bank_code: "SCB"
 *                     bank_name: "SaiGon Bank"
 *                     public_key: "avkjnn93"
 *                     encoding_type: "PGP"
 *       "500":
 *         description: Undefined Bank
 *         content:
 *           application/json:
 *             example:
 *               isSuccess: false
 *               message: 'Can not get bank list'
 */
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

/**
 * @swagger
 * /banks/infoUser:
 *   get:
 *     summary: Get user's information by account number
 *     tags: [Banks]
 *     parameters:
 *     - name: account_number
 *       in: query
 *       description: User's account number
 *       required: true
 *       schema:
 *         type: string
 *     responses:
 *       "200":
 *         description: Successful operation.
 *         content:
 *           application/json:
 *             example:
 *               value:
 *                 isSuccess: true
 *                 userInfo:
 *                 - full_name: "Nguyen Van A"
 *                   email: "test@abc.com"
 *                   phone: "0123456789"
 *       "400":
 *         description: Undefined user.
 *         content:
 *           application/json:
 *             example:
 *               isSuccess: false
 *               message: 'Can not find user info'
 */
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