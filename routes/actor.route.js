// /**
//  * @swagger
//  * tags:
//  *   name: Actor
//  *   description: API to manage actors.
//  * components:
//  *   schemas:
//  *     Actor:
//  *       type: object
//  *       required:
//  *         - first_name
//  *         - last_name
//  *       properties:
//  *         actor_id:
//  *           type: integer
//  *           description: The auto-increment id of the category.
//  *         first_name:
//  *           type: string
//  *           description: First name of an actor.
//  *         last_name:
//  *           type: string
//  *           description: Last name of an actor.
//  *         last_update:
//  *           type: string
//  *           format: date
//  *           description: The date of the actor creation or update.
//  *       example:
//  *          actor_id: 1
//  *          first_name: Tony
//  *          last_name: Stark
//  *          last_update: 2006-02-14T21:46:27.000Z
//  */
// import express from 'express';
// import actorModel from '../models/actor.model.js';
// import validate, {validateParams} from '../middlewares/validate.mdw.js';
//
// import {readFile} from 'fs/promises';
// import filmActor from "../models/film_actor.model.js";
//
// const actorSchema = JSON.parse(await readFile(new URL('../schemas/user-account.json', import.meta.url)));
//
// const router = express.Router();
//
// /**
//  * @swagger
//  * /actors:
//  *   get:
//  *     summary: Get a list of all actors
//  *     tags: [Actor]
//  *     responses:
//  *       "200":
//  *         description: Successful operation.
//  *         content:
//  *           application/json:
//  *             schema:
//  *              type: array
//  *              items:
//  *                $ref: '#/components/schemas/Actor'
//  */
//
// router.get('/', async function (req, res) {
//     const list = await actorModel.findAll();
//     res.json(list);
// });
//
// /**
//  * @swagger
//  * /actors:
//  *   post:
//  *     summary: Create a new actor
//  *     tags: [Actor]
//  *     requestBody:
//  *       description: Created user object
//  *       content:
//  *         application/json:
//  *           schema:
//  *             $ref: '#/components/schemas/Actor'
//  *           example:
//  *             first_name: Tony
//  *             last_name: Stark
//  *     responses:
//  *       "201":
//  *         description: Successful operation.
//  *         content:
//  *           application/json:
//  *             example:
//  *               actor_id: 1
//  *               first_name: Tony
//  *               last_name: Stark
//  *             schema:
//  *               $ref: '#/components/schemas/Actor'
//  *       "400":
//  *         description: Failed operation. Invalid schema.
//  *         content:
//  *           application/json:
//  *             example:
//  *                - instancePath: /last_name
//  *                  schemaPath: '#/properties/last_name/type'
//  *                  keyword: type
//  *                  params: {
//  *                    type: string
//  *                  }
//  *                  message: must be string
//  */
//
// router.post('/', validate(actorSchema), async function (req, res) {
//     let actor = req.body;
//     const ret = await actorModel.add(actor);
//     actor = {
//         actor_id: ret[0],
//         ...actor
//     }
//     res.status(201).json(actor);
// });
//
//
// /**
//  * @swagger
//  * /actors/{actor_id}:
//  *   put:
//  *     summary: Update an actor's first name and last name.
//  *     tags: [Actor]
//  *     parameters:
//  *         - in: path
//  *           name: actor_id
//  *           required: true
//  *           schema:
//  *             type: integer
//  *             minimum: 1
//  *           description: value which indentify an actor
//  *     requestBody:
//  *       description: Provide actor's first name and last name.
//  *       content:
//  *         application/json:
//  *           schema:
//  *             $ref: '#/components/schemas/Actor'
//  *           example:
//  *             first_name: Tony
//  *             last_name: Stark
//  *     responses:
//  *       "200":
//  *         description: Successful operation.
//  *         content:
//  *           application/json:
//  *              example:
//  *                actor_id: 10
//  *                isFound: true
//  *                actorInfoUpdated: {
//  *                    first_name: Tony,
//  *                    last_name: Stark
//  *                }
//  *       "404":
//  *         description: Not matching actor found by actor_id.
//  *         content:
//  *           application/json:
//  *             example:
//  *                actor_id: 2000
//  *                isFound: false
//  *       "400":
//  *         description: Failed operation. Invalid schema.
//  *         content:
//  *           application/json:
//  *             example:
//  *                - instancePath: /first_name
//  *                  schemaPath: '#/properties/first_name/type'
//  *                  keyword: type
//  *                  params: {
//  *                    type: string
//  *                  }
//  *                  message: must be string
//  */
// router.put('/:id', validateParams, validate(actorSchema), async function (req, res) {
//     const actorID = +req.params.id;
//     let actor = req.body
//     const isExist = await actorModel.isExist(actorID)
//     const result = {
//         actorID,
//         isFound: isExist,
//     }
//     if (isExist == true) {
//         actor.actor_id = actorID
//         await actorModel.update(actor)
//         result.actorInfoUpdated = {
//             first_name: actor.first_name,
//             last_name: actor.last_name
//         }
//     }
//     res.status(200).json(result);
// })
//
//
// /**
//  * @swagger
//  * /actors/{actor_id}:
//  *   delete:
//  *     summary: Delete an actor by actor_id
//  *     parameters:
//  *         - in: path
//  *           name: actor_id
//  *           required: true
//  *           schema:
//  *             type: integer
//  *             minimum: 1
//  *           description: value which indentify an actor
//  *     tags: [Actor]
//  *     responses:
//  *       "200":
//  *         description: Successful operation.
//  *         content:
//  *           application/json:
//  *              example:
//  *                actor_id: 23
//  *                isFound: true
//  *                actorInfo: {
//  *                    first_name: Tony,
//  *                    last_name: Stark
//  *                }
//  *                isDeleted: true
//  *       "404":
//  *         description: Not matching actor found by actor_id.
//  *         content:
//  *           application/json:
//  *             example:
//  *                actor_id: 2000
//  *                isFound: false
//  *       "500":
//  *         description: Internal Server Error / Foreign Key Constraint
//  *         content:
//  *           application/json:
//  *             example:
//  *                actor_id: 16
//  *                isFound: true
//  *                actorInfo: {
//  *                    first_name: Tony,
//  *                    last_name: Stark
//  *                }
//  *                isDeleted: false
//  *                error: Foreign key constraint failed.
//  */
// router.delete('/:id', validateParams, async function (req, res) {
//     const actor_id = +req.params.id;
//
//     const isExist = await actorModel.isExist(actor_id)
//     const result = {actor_id, isFound: isExist}
//
//     if (isExist) {
//         const actorInfo = await actorModel.findById(actor_id)
//         delete actorInfo.actor_id
//         delete actorInfo.last_update
//         result.actorInfo = actorInfo
//
//         const isRestrict = await filmActor.isExist(actor_id)
//         console.log(actor_id)
//         if (isRestrict) {
//             result.isDeleted = false
//             result.error = "Foreign key constraint failed."
//         } else {
//             result.isDeleted = true
//             await actorModel.delete(actor_id)
//         }
//     }
//     res.status(200).json(result);
// })
//
// export default router;