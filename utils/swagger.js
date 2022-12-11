export const swaggerConfigOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Sakila Express API with Swagger',
            version: '1.0.0',
            description:
                'This is a simple CRUD API application made with Express and documented with Swagger'
        },
        servers: [
            {
                url: "http://localhost:3030/api/",
            }
        ],
    },
    apis: ['./routes/*.js']
};