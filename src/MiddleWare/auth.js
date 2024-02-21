const jwt = require("jsonwebtoken")

const authentication = function (req, res, next) {
    try {
      let token = req.headers["authorization"];
      if (!token) return res.status(400).send({ status: false, message: "token must be present" });

         let tokenSplit= token.split(' ')
        
        const decodedToken=jwt.verify(tokenSplit[1],"this is a private key")
        
            req['decodedToken']=decodedToken.userId
            
            next()

    } catch (error) {
      if (error.message=="invalid token"){  
        return res.status(403).send({ status: false, message: "token is invalid" });
      }
   
        if(error.message=="jwt expired"){
        return res.status(404).send({status:false,message:"Please Login once again, the token has expired"})
      }

        if(error.message=="invalid signature"){
        return res.status(403).send({status:false,message:"token is invalid"})
      }

    return res.status(500).send({ status: false, Error: error.message });
    }
  };
   
module.exports= {authentication}