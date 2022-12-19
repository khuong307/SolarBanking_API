import randomString from "randomstring";
import banking_accountModel from "../models/banking-account.model.js";
import numeral from 'numeral'
import userModel from "../models/user.model.js";

export function balanceToInt(value){
    return parseInt(value.replaceAll(',',''))
}

export function generateContent(fullname, username, email, password, account, balance){
    const content = "" +
        `Dear, ${fullname}\n` +
        "Thank you for choosing Solar Banking services," +
        " as a new customer yourself. Solar Banking wrote this email to provide your information and resources to access our system.\n" +
        "\n" +
        "Here is your account information:\n" +
        `Username: ${username}\n` +
        `Password: ${password}\n` +
        `Account Number: ${account}\n` +
        `Initial Balance: ${balance}\n` +
        `\nPlease be aware that you only accept email from Solar Banking base on your registration by your email: ${email}`
    return content
}

export function generateTransfer(fullname, account, amount, balance, message, email){
    const content = "" +
        `Dear, ${fullname}\n` +
        "Solar Banking receive a request to transfer money to your invidual account.\n" +
        "Here is transaction information:\n" +
        `Account Number: ${account}\n` +
        `Additional amount of money: ${amount}\n` +
        `Current Balance: ${numeral(balance).format('0,0')}\n` +
        `Message: ${message}\n` +
        `\nPlease be aware that you only accept email from Solar Banking base on your registration by your email: ${email}`
    return content
}

export async function generateAccount(){
    var account = ""
    while(true){
        account = randomString.generate({
            length: 8,
            charset: 'numeric'
        });
        const isExisted = await banking_accountModel.genericMethods.isExist(account)
        if (isExisted == false)
            break
    }
    return account
}

export async function filterTransactionByTypeAndDes(transactions, type, src, isSLB){
    const ans = []
    for (const trans of transactions){
        if (trans.transaction_type == type && trans.is_success == 1){
            const other_side  = src == 1? trans.des_account_number : trans.src_account_number
            const other = await banking_accountModel.genericMethods.findByCol("account_number", other_side)
            delete trans.otp_code
            if (isSLB == true){
                if (trans.src_account_number == "SLB") {
                    const info = await userModel.genericMethods.findById(other.user_id)
                    trans.other_fullname = info.full_name
                    ans.push(trans)
                }
            }else{
                if(isSLB == false){
                    if (trans.src_account_number != "SLB"){
                        const info = await userModel.genericMethods.findById(other.user_id)
                        trans.other_fullname = info.full_name
                        ans.push(trans)
                    }
                }
            }
        }
    }
    return ans
}