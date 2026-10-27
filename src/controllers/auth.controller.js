import passport from "../config/passport.js";
import { generateToken } from "../utils/jwt.js";
import { registerUser } from "../services/auth.services.js";
import { findUserById } from "../repositories/user.repository.js"

export function login(req, res, next) {

  passport.authenticate(
    "local",
    { session: false },
    (error, user, info) => {

      if (error) {
        return next(error);
      }


      if (!user) {
        return res.status(401).json({
          message: info.message
        });
      }


      const token = generateToken(user);


      return res.json({
        user: {
          id: user.id,
          firstName: user.firstName,
          phone: user.phone,
          role: user.role
        },
        token
      });

    }
  )(req, res, next);

}

export async function register(req, res, next) {

  try {

    const user = await registerUser(req.body);


    const token = generateToken(user);


    res.status(201).json({
      user: {
        id: user.id,
        firstName: user.firstName,
        phone: user.phone,
        role: user.role,
        city: user.city
      },
      token
    });


  } catch (error) {

    next(error);

  }

}

export async function me (req, res, next) {
  try 
  { 
     const user = await findUserById(req.user.id);

    if(!user) {
      return res.status(404).json({
        message: "user not found"
      });
    }

    res.json(user);

  }catch(error) {

    next(error);

  }
}