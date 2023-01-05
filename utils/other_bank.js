import * as dotenv from 'dotenv';
dotenv.config();
import md5 from "md5"
import crypto from "crypto"
import { BANK_CODE } from './bank_constanst.js';

export default {
    // generateObjSign(accountDesNumber,amount,description,payTransactionFee,accountSrcNumber,bankCode){
    //     return {
    //         accountDesNumber:accountDesNumber,
    //         amount:amount,
    //         description:description,
    //         payTransactionFee:payTransactionFee,
    //         accountSrcNumber:accountSrcNumber,
    //         slug: bankCode
    //     }
    // },

    // generateMsgToken(obj,timestamp){
    //     let data = JSON.stringify(obj)
    //     return md5(data+timestamp+process.env.SECRET_KEY)
    // },

    // generateSignature(obj){
    //     let dataSign = JSON.stringify(obj)
    //     let signer = crypto.createSign("RSA-SHA256")
    //     signer.update(dataSign)
    //     let sign = signer.sign(process.env.PRIVATE_KEY,"hex")
    //     console.log("signature: ",sign)
    //     return sign        
    // },

    // generateObjDesBank(srcNumber,desNumber,amount,description,payTransactionFee,msgToken,timestamp,sign){
    //     return  {
    //         accountNumber:srcNumber,
    //         transactionInfo:{
    //             accountDesNumber:desNumber,
    //             amount:amount,
    //             description:description,
    //             payTransactionFee:payTransactionFee
    //         },
    //         msgToken:msgToken,
    //         timestamp:timestamp,
    //         signature:sign,
    //         slug:BANK_CODE
    //     }
    // },

    verifyTransactionDesBank(obj,signature){
        let data = JSON.stringify(obj)
        const verify = crypto.createVerify('RSA-SHA256');
        verify.write(data);
        verify.end();
        return verify.verify(process.env.TXB_PUBLIC_KEY, signature, 'hex')
    }
}