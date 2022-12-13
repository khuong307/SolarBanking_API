import jwt from 'jsonwebtoken';

export default {
     async generateToken(payload, secretSignature, tokenLife) {
        return await jwt.sign(
            {
                payload,
            },
            secretSignature,
            {
                algorithm: 'HS256',
                expiresIn: tokenLife,
            },
        );
     },

    async decodeToken(token, secretKey) {
         try {
             return await jwt.verify(token, secretKey, {
                 ignoreExpiration: true,
             });
         } catch (e) {
             return null;
         }
    },

    async verifyToken(token, secretKey) {
         try {
             return await jwt.verify(token, secretKey);
         } catch (e) {
             return null;
         }
    }
}