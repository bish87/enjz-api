import jwt from "jsonwebtoken";

export function authenticate (req, res, next) {
  try {
    const authHeader = req.get("Authorization");

    if (!authHeader) {
      return res.status(401).json({
        message: "Authentication required"
      });
    }

    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
       return res.status(401).json({
          message: "Invalid token format"
       });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;

    next();


  } catch (error) {

    return res.status(401).json({
      message: "Invalid or expired token"
    });

  }
}

export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if(!req.user) {
      return res.status(401).json({
          message: "not authenticated"
      })
    }
    if(!allowedRoles.includes(req.user.role)){
      return res.status(403).json({
        message: "you do not have permission"
      })
    }
    next();
  }
}


export function errorHandler(err, req, res, next) {

  console.error(err);


  res.status(400).json({
    message: err.message
  });

}
