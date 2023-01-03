export const swaggerConfigOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Solar Banking API Documentation',
            version: '1.0.0',
            description:
                'This is a Internet banking API made with Express and documented with Swagger'
        },
        servers: [
            {
                url: "http://localhost:3030/api/",
            }
        ],
    },
    apis: ['./routes/*.js']
};