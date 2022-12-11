import jwt from 'jsonwebtoken';

export default {
     generateToken(payload, secretSignature, tokenLife) {
        return jwt.sign(
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

    decodeToken(token, secretKey) {
         try {
             return jwt.verify(token, secretKey, {
                 ignoreExpiration: true,
             });
         } catch (e) {
             return null;
         }
    },

    verifyToken(token, secretKey) {
         try {
             return jwt.verify(token, secretKey);
         } catch (e) {
             return null;
         }
    }
}