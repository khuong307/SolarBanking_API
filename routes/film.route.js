// /**
//  * @swagger
//  * tags:
//  *   name: Film
//  *   description: API to manage films.
//  * components:
//  *   schemas:
//  *     Film:
//  *       type: object
//  *       required:
//  *         - title
//  *         - language_id
//  *       properties:
//  *         film_id:
//  *           type: integer
//  *           description: The auto-increment id of the film.
//  *         title:
//  *           type: string
//  *           description: The title of the film.
//  *         description:
//  *           type: string
//  *           description: A short description or plot summary of the film (default value is NULL).
//  *         release_year:
//  *           type: integer
//  *           description: The year in which the movie was released (range 1901 - 2155, default value is NULL).
//  *         language_id:
//  *           type: integer
//  *           description: A foreign key pointing at the language table; identifies the language of the film (range 1 - 255).
//  *         original_language_id:
//  *           type: integer
//  *           description: A foreign key pointing at the language table; identifies the original language of the film. Used when a film has been dubbed into a new language (range 1 - 255, default value is NULL).
//  *         rental_duration:
//  *           type: integer
//  *           description: The length of the rental period, in days (range 1 - 255, default value is 3).
//  *         rental_rate:
//  *           type: number
//  *           description: The cost to rent the film for the period specified in the rental_duration (range 0 < x < 100 with x rounds to 2 decimal digits, default value is 4.99).
//  *         length:
//  *           type: integer
//  *           description: The duration of the film, in minutes (range 1 - 65535, default value is NULL).
//  *         replacement_cost:
//  *           type: number
//  *           description: The amount charged to the customer if the film is not returned or is returned in a damaged state (range 0 < x < 1000 with x rounds to 2 decimal digits, default value is 19.99).
//  *         rating:
//  *           type: string
//  *           description: The rating assigned to the film. Can be one of G, PG, PG-13, R, or NC-17 (default value is G).
//  *         special_features:
//  *           type: string
//  *           description: Lists which common special features are included on the DVD. Can be zero or more of Trailers, Commentaries, Deleted Scenes, Behind the Scenes (each of them is separated by commas without space, default value is NULL).
//  *         last_update:
//  *           type: string
//  *           format: date
//  *           description: The date of the film creation or update.
//  *       example:
//  *         film_id: 1
//  *         title: ACADEMY DINOSAUR
//  *         description: A Epic Drama of a Feminist And a Mad Scientist who must Battle a Teacher in The Canadian Rockies
//  *         release_year: 2006
//  *         language_id: 1
//  *         original_language_id: null
//  *         rental_duration: 6
//  *         rental_rate: 0.99
//  *         length: 86
//  *         replacement_cost: 20.99
//  *         rating: PG
//  *         special_features: Deleted Scenes,Behind the Scenes
//  *         last_update: 2006-02-14T22:03:42.000Z
//  */
//
// import express from 'express';
// import filmModel from '../models/film.model.js';
// import validate from '../middlewares/validate.mdw.js';
// import {readFile} from 'fs/promises';
// import {validateFilmForeignKey, validateParams} from '../middlewares/validate.mdw.js';
//
// const filmSchema = JSON.parse(await readFile(new URL('../schemas/film.json', import.meta.url)));
//
// const router = express.Router();
//
// /**
//  * @swagger
//  * /films:
//  *   get:
//  *     summary: Get a list of all films
//  *     tags: [Film]
//  *     responses:
//  *       "200":
//  *         description: Successful operation.
//  *         content:
//  *           application/json:
//  *             schema:
//  *              type: array
//  *              items:
//  *                $ref: '#/components/schemas/Film'
//  */
// router.get('/', async function (req, res) {
//     const films = await filmModel.findAll();
//
//     res.json(films);
// });
//
// /**
//  * @swagger
//  * /films/{film_id}:
//  *   get:
//  *     summary: Get a film by id
//  *     tags: [Film]
//  *     parameters:
//  *       - name: film_id
//  *         in: path
//  *         description: ID of film to return
//  *         required: true
//  *         schema:
//  *          type: integer
//  *          minimum: 1
//  *     responses:
//  *       "200":
//  *         description: Successful operation.
//  *         content:
//  *           application/json:
//  *             schema:
//  *                $ref: '#/components/schemas/Film'
//  *       "400":
//  *         description: Failed operation. Invalid type.
//  *         content:
//  *           application/json:
//  *             example:
//  *                error: The id must be a positive integer
//  */
// router.get('/:id', validateParams, async function (req, res) {
//     const id = +req.params.id;
//     const film = await filmModel.findById(id);
//
//     res.json(film);
// });
//
// /**
//  * @swagger
//  * /films:
//  *   post:
//  *     summary: Create a new film
//  *     tags: [Film]
//  *     requestBody:
//  *       description: Created film object
//  *       content:
//  *         application/json:
//  *           schema:
//  *             $ref: '#/components/schemas/Film'
//  *           example:
//  *             title: ACADEMY DINOSAUR
//  *             description: A Epic Drama of a Feminist And a Mad Scientist who must Battle a Teacher in The Canadian Rockies
//  *             release_year: 2006
//  *             language_id: 1
//  *             original_language_id: null
//  *             rental_duration: 6
//  *             rental_rate: 0.99
//  *             length: 86
//  *             replacement_cost: 20.99
//  *             rating: PG
//  *             special_features: Deleted Scenes,Behind the Scenes
//  *     responses:
//  *       "201":
//  *         description: Successful operation.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Film'
//  *             example:
//  *               film_id: 1
//  *               title: ACADEMY DINOSAUR
//  *               description: A Epic Drama of a Feminist And a Mad Scientist who must Battle a Teacher in The Canadian Rockies
//  *               release_year: 2006
//  *               language_id: 1
//  *               original_language_id: null
//  *               rental_duration: 6
//  *               rental_rate: 0.99
//  *               length: 86
//  *               replacement_cost: 20.99
//  *               rating: PG
//  *               special_features: Deleted Scenes,Behind the Scenes
//  *       "400":
//  *         description: Failed operation. Invalid schema.
//  *         content:
//  *           application/json:
//  *             example:
//  *                - instancePath: /release_year
//  *                  schemaPath: '#/properties/release_year/type'
//  *                  keyword: type
//  *                  params: {
//  *                    type: integer
//  *                  }
//  *                  message: must be integer
//  *       "409":
//  *         description: Failed operation. Violate foreign key constraint.
//  *         content:
//  *           application/json:
//  *             example:
//  *                error: The language_id does not exist in database!
//  */
// router.post('/', validate(filmSchema), validateFilmForeignKey, async function (req, res) {
//     const film = req.body;
//
//     const ret = await filmModel.add(film);
//
//     res.status(201).json({
//         "film_id": ret[0],
//         ...film
//     });
// });
//
// export default router;