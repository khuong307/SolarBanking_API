import express from 'express';
import { readFile } from 'fs/promises';

import {authRole, authUser} from '../middlewares/auth.mdw.js';
import role from '../utils/role.js';
import validate, {validateParams} from '../middlewares/validate.mdw.js';
import bankingAccountModel from '../models/banking-account.model.js';
import userModel from '../models/user.model.js';
import recipientModel from '../models/recipient.model.js';
import bankModel from "../models/bank.model.js";
import userAccountModel from "../models/user-account.model.js";
import banking_accountModel from "../models/banking-account.model.js";
import transactionModel from "../models/transaction.model.js";
import {filterTransactionByTypeAndDes} from "../utils/bank.js";

const userSchema = JSON.parse(await readFile(new URL('../schemas/user.json', import.meta.url)));
const recipientSchema = JSON.parse(await readFile(new URL('../schemas/recipient.json', import.meta.url)));

const router = express.Router();

// Get all banking accounts API
router.get('/:userId/accounts', validateParams, authUser, authRole(role.CUSTOMER), async function(req, res) {
    const userId = +req.params.userId;
    const accounts = await bankingAccountModel.findByUserId(userId);

    return res.json(accounts);
});

// Get all saving accounts API
router.get('/:userId/savingAccounts', validateParams, authUser, authRole(role.CUSTOMER), async function(req, res) {
    const userId = +req.params.userId;
    const SAVING_ACCOUNT_TYPE = 0;
    const accounts = await bankingAccountModel.findByUserIdAndAccountType(userId, SAVING_ACCOUNT_TYPE);

    return res.json(accounts);
});

// Get all spend accounts API
router.get('/:userId/spendAccounts', validateParams, authUser, authRole(role.CUSTOMER), async function(req, res) {
    const userId = +req.params.userId;
    const SAVING_ACCOUNT_TYPE = 1;
    const accounts = await bankingAccountModel.findByUserIdAndAccountType(userId, SAVING_ACCOUNT_TYPE);

    return res.json(accounts[0]);
});

// Get info of user by id API
router.get('/:userId', validateParams, authUser, authRole(role.CUSTOMER), async function(req, res) {
    const userId = +req.params.userId;
    const user = await userModel.genericMethods.findById(userId);

    return res.json(user);
});

// Update info of user by id API
router.put('/:userId', validateParams, validate(userSchema), authUser, authRole(role.CUSTOMER), async function(req, res) {
    const userId = +req.params.userId;
    const updatedInfo = req.body;

    if (updatedInfo && Object.keys(updatedInfo).length === 0 && Object.getPrototypeOf(updatedInfo) === Object.prototype)
        return res.status(400).json({
            message: 'The request body must not be empty'
        });

    await userModel.genericMethods.update(userId, updatedInfo);
    const user = await userModel.genericMethods.findById(userId);

    return res.json(user);
});

// Get recipient list by user id API
router.get('/:userId/recipients',validateParams, authUser, authRole(role.CUSTOMER), async function(req, res) {
    const userId = +req.params.userId;
    const recipients = await recipientModel.findByUserId(userId);

    for (let i = 0; i < recipients.length; i++) {
        const accountOwner = await bankingAccountModel.genericMethods.findById(recipients[i].account_number);
        let connectedBank = 'Solar Banking';

        if (accountOwner.bank_code !== null) {
            const bank = await bankModel.genericMethods.findById(accountOwner.bank_code);
            connectedBank = bank.bank_name;
        }

        recipients[i].owner_id = accountOwner.user_id;
        recipients[i].bank_name = connectedBank;
    }

    return res.json(recipients);
});

// Add a recipient API
router.post('/:userId/recipients', validateParams, validate(recipientSchema), authUser, authRole(role.CUSTOMER), async function(req, res) {
    const userId = +req.params.userId;
    const accountNumber = req.body.account_number;
    const bankCode = req.body.bank_code || null;
    let nickname = req.body.nick_name || null;

    const bankingAccount = await bankingAccountModel.genericMethods.findById(accountNumber);
    const existingRecipient = await recipientModel.findByUserIdAndAccountNumber(userId, accountNumber);

    if (existingRecipient.length > 0)
        return res.status(400).json({
            isSuccess: false,
            message: 'The account number existed in the recipient list!'
        });

    if (bankCode !== null) {
        // Call API from connected bank to check existing account.
    }
    else {
        if (bankingAccount !== null) {
            if (bankingAccount.user_id === userId)
                return res.status(400).json({
                    isSuccess: false,
                    message: 'Can not add your account number to recipient list!'
                });

            if (bankingAccount.is_spend_account === 0)
                return res.status(400).json({
                    isSuccess: false,
                    message: 'The account number must not be saving account!'
                });

            if (nickname === null) {
                const owner = await userAccountModel.findByUserId(bankingAccount.user_id);
                nickname = owner.username;
            }

            const recipient = {
                user_id: userId,
                account_number: accountNumber,
                nick_name: nickname
            };

            await recipientModel.genericMethods.add(recipient);
            recipient.owner_id = bankingAccount.user_id;

            return res.status(201).json({
                isSuccess: true,
                message: 'Add recipient successfully!',
                recipient
            });
        }

        return res.status(400).json({
            isSuccess: false,
            message: 'The account number does not exist in the banking system. Please check again!'
        });
    }
});

// Update nickname of a recipient API
router.put('/:userId/recipients/:accountNumber', validateParams, authUser, authRole(role.CUSTOMER), async function(req, res) {
    const userId = +req.params.userId;
    const accountNumber = req.params.accountNumber;
    const nickname = req.body.nick_name || null;

    if (nickname === null)
        return res.status(400).json({
            isSuccess: false,
            message: 'The request body must not be empty!'
        });

    const result = await recipientModel.updateNickNameByUserIdAndAccountNumber(userId, accountNumber, nickname);

    if (!result)
        return res.status(400).json({
            message: 'Account number or user id does not exist!'
        });

    return res.json({ accountNumber, nick_name: nickname });
});

// Delete recipient API
router.delete('/:userId/recipients/:accountNumber', validateParams, authUser, authRole(role.CUSTOMER), async function(req, res) {
    const userId = +req.params.userId;
    const accountNumber = req.params.accountNumber;

    const result = await recipientModel.deleteByUserIdAndAccountNumber(userId, accountNumber);

    if (!result)
        return res.status(400).json({
            isSuccess: false,
            message: 'Account number or user id does not exist!'
        });

    return res.status(200).json({
        isSuccess: true,
        message: 'Delete successfully!'
    });
});

// Get list of transaction history
router.get('/:userId/history', validateParams, authUser, authRole(role.CUSTOMER), async function(req, res) {
    const userId = +req.params.userId;
    const userInfo = await banking_accountModel.genericMethods.findByCol("user_id", userId)
    if (userInfo == null){
        return res.status(209).json({
            isFound: false,
            message: "User ID is invalid!"
        })
    }
    else{
        const accessInfo = userInfo.account_number
        const chargeData = await transactionModel.genericMethods.findBy2ColMany("des_account_number", accessInfo, "src_account_number", "SLB")
        const all_transaction = await transactionModel.genericMethods.findByColMany("src_account_number", accessInfo)
        const transfer_list_by_customer = await filterTransactionByTypeAndDes(all_transaction, 1, 1,false)
        const charge_by_SLB = await filterTransactionByTypeAndDes(chargeData, 1, 1, true)
        const paid_debt_list = await filterTransactionByTypeAndDes(all_transaction, 2, false)

        const received_list = await transactionModel.genericMethods.findByColMany("des_account_number", accessInfo)
        const received_from_others = await filterTransactionByTypeAndDes(received_list, 1, 2, false)
        const recevied_debt_list = await filterTransactionByTypeAndDes(received_list, 2, 2, false)

        return res.status(200).json({
            isFound: true,
            transfer_list_by_customer,
            paid_debt_list,
            recevied_debt_list,
            charge_by_SLB,
            received_from_others,
        })
    }

});
export default router;