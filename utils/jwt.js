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
    },


    // ----------- RS256 -----------------------
    async generateAsyncToken(payload,privateKey,tokenLife){
        return await jwt.sign(
            {
                payload,
            },
            privateKey,
            {
                algorithm: 'RS256',
                expiresIn: tokenLife,
            },
        );
    },

    async decodeAsyncToken(token){
        try {
            return await jwt.decode(token,{
                complete: true,
            });
        } catch (e) {
            return null;
        }
    },

    async verifyAsyncToken(payload,publicKey){
        try {
            return await jwt.verify(payload,publicKey,{
                algorithms:"RS256"
            });
        } catch (e) {
            console.log(e)
            return null;
        }
    }
}