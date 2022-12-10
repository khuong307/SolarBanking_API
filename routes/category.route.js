/**
 * @swagger
 * tags:
 *   name: Category
 *   description: API to manage categories.
 * components:
 *   schemas:
 *     Category:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         category_id:
 *           type: integer
 *           description: The auto-increment id of the category.
 *         name:
 *           type: string
 *           description: The name of the category.
 *         last_update:
 *           type: string
 *           format: date
 *           description: The date of the category creation or update.
 *       example:
 *          category_id: 1
 *          name: Action
 *          last_update: 2006-02-14T21:46:27.000Z
 */

import express from 'express';
import categoryModel from '../models/category.model.js';
import filmCategoy from '../models/film_category.model.js'
import validate, {validateParams} from '../middlewares/validate.mdw.js';

import { readFile } from 'fs/promises';
const categorySchema = JSON.parse(await readFile(new URL('../schemas/category.json', import.meta.url)));

const router = express.Router();

/**
 * @swagger
 * /categories:
 *   get:
 *     summary: Get a list of all categories
 *     tags: [Category]
 *     responses:
 *       "200":
 *         description: Successful operation.
 *         content:
 *           application/json:
 *             schema:
 *              type: array
 *              items:
 *                $ref: '#/components/schemas/Category'
*/

router.get('/', async function (req, res) {
  const list = await categoryModel.findAll();
  res.json(list);
});

/**
 * @swagger
 * /categories:
 *   post:
 *     summary: Create a new category
 *     tags: [Category]
 *     requestBody:
 *       description: Created user object
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Category'
 *           example:
 *             name: Action
 *     responses:
 *       "201":
 *         description: Successful operation.
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Category'
 *       "400":
 *         description: Failed operation. Invalid schema.
 *         content:
 *           application/json:
 *             example:
 *                - instancePath: /name
 *                  schemaPath: '#/properties/name/type'
 *                  keyword: type
 *                  params: {
 *                    type: string
 *                  }
 *                  message: must be string
 */
router.post('/', validate(categorySchema), async function (req, res) {
  let category = req.body;
  const ret = await categoryModel.add(category);
  category = {
    category_id: ret[0],
    ...category
  }
  res.status(201).json(category);
});

/**
 * @swagger
 * /categories/{category_id}:
 *   put:
 *     summary: Update a category name
 *     tags: [Category]
 *     parameters:
 *         - in: path
 *           name: category_id
 *           required: true
 *           schema:
 *             type: integer
 *             minimum: 1
 *           description: value which indentify a category
 *     requestBody:
 *       description: Provide new category name.
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Category'
 *           example:
 *             name: Sci-fi
 *     responses:
 *       "200":
 *         description: Successful operation.
 *         content:
 *           application/json:
 *              example:
 *                category_id: 10
 *                isFound: true
 *                categoryInfoUpdated: {
 *                    name: Sci-fi
 *                }
 *       "404":
 *         description: Not matching category found by category_id.
 *         content:
 *           application/json:
 *             example:
 *                category_id: 2000
 *                isFound: false
 *       "400":
 *         description: Failed operation. Invalid schema.
 *         content:
 *           application/json:
 *             example:
 *                - instancePath: /name
 *                  schemaPath: '#/properties/name/type'
 *                  keyword: type
 *                  params: {
 *                    type: string
 *                  }
 *                  message: must be string
 */

router.put('/:id', validateParams, validate(categorySchema), async function(req, res){
  const categoryID = +req.params.id
  let cate = req.body
  const isExist = await categoryModel.isExist(categoryID)
  const result = {
    categoryID,
    isFound: isExist,
  }
  if (isExist){
    cate.category_id = categoryID
    await categoryModel.update(cate)
    result.categoryInfoUpdated = {
      name: cate.name,
    }
    return res.status(200).json(result);
  }
  res.status(404).json(result);

})


/**
 * @swagger
 * /categories/{category_id}:
 *   delete:
 *     summary: Delete a category by category_id
 *     parameters:
 *         - in: path
 *           name: category_id
 *           required: true
 *           schema:
 *             type: integer
 *             minimum: 1
 *           description: value which indentify a category
 *     tags: [Category]
 *     responses:
 *       "200":
 *         description: Successful operation.
 *         content:
 *           application/json:
 *              example:
 *                category_id: 23
 *                isFound: true
 *                cateInfo: {
 *                    name: lalala
 *                }
 *                isDeleted: true
 *       "404":
 *         description: Not matching category found by category_id.
 *         content:
 *           application/json:
 *             example:
 *                category_id: 2000
 *                isFound: false
 *       "500":
 *         description: Internal Server Error / Foreign Key Constraint
 *         content:
 *           application/json:
 *             example:
 *                category_id: 16
 *                isFound: true
 *                cateInfo: {
 *                    name: Sci-fi
 *                }
 *                isDeleted: false
 *                error: Foreign key constraint failed.
 */
router.delete('/:id', validateParams, async function(req, res){
  const category_id = +req.params.id;

  const isExist = await categoryModel.isExist(category_id)
  const result = {category_id, isFound: isExist}

  if (isExist){
    const cateInfo = await categoryModel.findById(category_id)
    delete cateInfo.category_id
    delete cateInfo.last_update
    result.cateInfo = cateInfo

    const isRestrict = await filmCategoy.isExist(category_id)
    if (isRestrict){
      result.isDeleted = false
      result.error = "Foreign key constraint failed."
      return res.status(500).json(result);
    }else{
      result.isDeleted = true
      await categoryModel.delete(category_id)
      return res.status(200).json(result);
    }
  }
  res.status(404).json(result);
})


export default router;