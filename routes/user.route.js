import express from 'express';
import { readFile } from 'fs/promises';

import {authRole, authUser} from '../middlewares/auth.mdw.js';
import role from '../utils/role.js';
import validate, {validateParams} from '../middlewares/validate.mdw.js';
import bankingAccountModel from '../models/banking-account.model.js';
import userModel from '../models/user.model.js';

const userSchema = JSON.parse(await readFile(new URL('../schemas/user.json', import.meta.url)));

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


export default router;