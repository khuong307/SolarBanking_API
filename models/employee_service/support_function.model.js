import randomstring from "randomstring";
import banking_accountModel from "./banking_account.model.js";
import numeral from 'numeral'

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
        account = randomstring.generate({
            length: 8,
            charset: 'numeric'
        });
        const isExisted = await banking_accountModel.isExist(account)
        if (isExisted == false)
            break
    }
    return account
}