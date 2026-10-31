import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import { findUserByPhone } from "../repositories/user.repository.js";

passport.use(
  new LocalStrategy(
    {
      usernameField: "phone",
      passwordField: "password",
    },

    async (phone, password, done) => {
      try {
        const user = await findUserByPhone(phone);

        if (!user) {
          return done(null, false, {
            message: "Invalid phone or password",
          });
        }

        const passwordMatch = await bcrypt.compare(password, user.passwordHash);

        if (!passwordMatch) {
          return done(null, false, {
            message: "Invalid phone or password",
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

export default passport;
