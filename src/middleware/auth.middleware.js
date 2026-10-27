import jwt from "jsonwebtoken";

export function authenticate (req, res, next) {
  try {
    const authHeader = req.header.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "Authentication required"
      });
    }

    const token = authHeader.split("")[1];

    if(!token) {
       return res.status(401).json({
          message: "Invaild token format"
       });
    }
    
    const decoded = jwt.verfiy(token, process.env.JWT_SECERT);

    req.user = decoded;

    next();


  } catch (error) {

    return res.status(401).json({
      message: "Invalid or expired token"
    });

  }
}


export function errorHandler(err, req, res, next) {

  console.error(err);


  res.status(400).json({
    message: err.message
  });

}