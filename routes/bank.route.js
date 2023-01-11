/**
 * @swagger
 * tags:
 *   name: Bank
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
 *          public_key: "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCBaupoGFgzyEg3itWMC6LijzHWWxeIyHz/KdIxq0KfugzvPthGnBn3FtZn+XrPQ10Vv5UTMhOUfNLg/QOOOfXVGmXxc8y1BOW8SBEAEK6WWJ9O6rORt/u2ShbxrPpVRef3YvZG/0Gq3kpi0LaqMFihj5lE3IOJp1zle/AAfKoR9wIDAQAB"
 *          encoding_type: "RSA"
 */
import express from "express"
import bankModel from "../models/bank.model.js"
import bankingAccountModel from "../models/banking-account.model.js";
import {authUser} from "../middlewares/auth.mdw.js";

const router = express.Router()


/**
 * @swagger
 * /banks:
 *   get:
 *     summary: Get all banks
 *     tags: [Bank]
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
 *               type: object
 *               properties:
 *                 isSuccess:
 *                   type: boolean
 *                   description: The get status
 *                 bankList:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/Bank"
 *             examples:
 *               Get successfully:
 *                 value:
 *                   isSuccess: true
 *                   bankList:
 *                   - bank_code: "SLB"
 *                     bank_name: "Solar Bank"
 *                     public_key: "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCBaupoGFgzyEg3itWMC6LijzHWWxeIyHz/KdIxq0KfugzvPthGnBn3FtZn+XrPQ10Vv5UTMhOUfNLg/QOOOfXVGmXxc8y1BOW8SBEAEK6WWJ9O6rORt/u2ShbxrPpVRef3YvZG/0Gq3kpi0LaqMFihj5lE3IOJp1zle/AAfKoR9wIDAQAB"
 *                     encoding_type: "RSA"
 *                   - bank_code: "SCB"
 *                     bank_name: "SaiGon Bank"
 *                     public_key: "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCBaupoGFgzyEg3itWMC6LijzHWWxeIyHz/KdIxq0KfugzvPthGnBn3FtZn+XrPQ10Vv5UTMhOUfNLg/QOOOfXVGmXxc8y1BOW8SBEAEK6WWJ9O6rORt/u2ShbxrPpVRef3YvZG/0Gq3kpi0LaqMFihj5lE3IOJp1zle/AAfKoR9wIDAQAB"
 *                     encoding_type: "PGP"
 *               Get new access token:
 *                 value:
 *                   accessToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXlsb2FkIjoibnNuaGFuIiwiaWF0IjoxNjcyNTU5NTUxLCJleHAiOjE2NzI1NjAxNTF9.9dtX_GD4xQxuJ59Rw7fQFKds4fTJe0bSr4LcjHYyDvw
 *       "401":
 *         description: Unauthorized user
 *         content:
 *           application/json:
 *             example:
 *               message: Unauthorized user!
 *       "500":
 *         description: Undefined Bank
 *         content:
 *           application/json:
 *             example:
 *               isSuccess: false
 *               message: 'Can not get bank list'
 */
router.get("/", authUser, async(req,res)=>{
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
 *     tags: [Bank]
 *     parameters:
 *     - name: account_number
 *       in: query
 *       description: User's account number
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
 *                 userInfo:
 *                   type: object
 *                   properties:
 *                     full_name:
 *                       type: string
 *                       description: The full name of user
 *                     email:
 *                       type: string
 *                       description: The email of user
 *                     phone:
 *                       type: string
 *                       description: The phone number of user
 *             example:
 *               value:
 *                 isSuccess: true
 *                 userInfo:
 *                   full_name: "Nguyen Van A"
 *                   email: "test@abc.com"
 *                   phone: "0123456789"
 *       "401":
 *         description: Unauthorized user
 *         content:
 *           application/json:
 *             example:
 *               message: Unauthorized user!
 *       "500":
 *         description: Undefined user.
 *         content:
 *           application/json:
 *             example:
 *               isSuccess: false
 *               message: 'Can not find user info'
 */
router.get("/infoUser", authUser, async function(req,res){
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