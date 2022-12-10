import Ajv from 'ajv';
import languageModel from '../models/language.model.js';

export default function validate(schema) {
  return function (req, res, next) {
    const ajv = new Ajv();
    ajv.addKeyword({
      keyword: 'set',
      validate: function validate(schema, data) {
        const SEPARATE_STRING = ",";
        const features = data.split(SEPARATE_STRING);

        validate.errors = [
          {
            instancePath: '/special_features',
            schemaPath: '#/properties/special_features/set',
            keyword: 'set',
            params: {
              allowedValues: [
                'Trailers',
                'Commentaries',
                'Deleted Scenes',
                'Behind the Scenes'
              ]
            },
            message: 'must be zero or more of allowed values'
          }
        ];

        return features.every(feature => schema.includes(feature));
      },
      errors: true
    });
    const valid = ajv.validate(schema, req.body);
    if (!valid) {
      return res.status(400).json(ajv.errors);
    }
    next();
  }
}

async function isValidForeignKey(id) {
  const data = await languageModel.findById(id);
  return data !== null;
}

export async function validateFilmForeignKey(req, res, next) {
  const language_id = req.body.language_id;
  const original_language_id = req.body.original_language_id;

  if (!await isValidForeignKey(language_id))
    return res.status(409).json({
      error: 'The language_id does not exist in database!'
    });

  if (original_language_id !== null && !await isValidForeignKey(original_language_id))
    return res.status(409).json({
      error: 'The original_language_id does not exist in database!'
    });

  next();
}

export function validateParams(req, res, next) {
  const id = +req.params.id;

  if (!Number.isInteger(id) || id <= 0)
    return res.status(400).json({
      error: 'The id must be a positive integer'
    });

  next();
}