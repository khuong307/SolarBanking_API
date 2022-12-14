import Ajv from 'ajv';

export default function validate(schema) {
    return function (req, res, next) {
        const ajv = new Ajv();
        const valid = ajv.validate(schema, req.body);
        if (!valid) {
            return res.status(400).json(ajv.errors);
        }
        next();
    }
}

export function validateParams(req, res, next) {
    const id = +req.params.userId;

    if (!Number.isInteger(id) || id <= 0)
        return res.status(400).json({
            error: 'The id parameter must be a positive integer'
        });

    next();
}