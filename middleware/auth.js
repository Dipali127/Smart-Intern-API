const jwt = require('jsonwebtoken');

const authentication = async function(req, res, next){
    try{
        const token = req.header('Authorization');
        //Check if token is provided in request header
        if(!token){
            return res.status(400).send({status: false, message:"Provide token"});
        }

        //Split the token to remove the "Bearer" prefix 
        const newToken = token.split(' ')[1];

        //Verify the token
        jwt.verify(newToken, process.env.SECRET_KEY, (error, decodedToken) => {
            if(error){
                return res.status(401).send({status:false, message:"token is invalid or expired"})
            }
            
            req.decodedToken = decodedToken;
            //Proceed to the next middleware or route handler
            next();
        })

    }catch(error){
        return res.status(500).send({status: false, message:error.message});
    }
}

module.exports = {authentication}