import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { storage } from "../storage";
import { logger } from "../services/logger.service";

/**
 * Configure Passport with Google OAuth 2.0 strategy
 */
export function configurePassport() {
  // Google OAuth Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID || "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        callbackURL: "/auth/google/callback",
        scope: ["profile", "email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Extract user info from Google profile
          const googleId = profile.id;
          const email = profile.emails?.[0]?.value;
          const firstName = profile.name?.givenName || "";
          const lastName = profile.name?.familyName || "";
          const profileImageUrl = profile.photos?.[0]?.value;

          if (!email) {
            return done(new Error("No email found in Google profile"), undefined);
          }

          // Check if user exists by Google ID
          const existingUserByGoogle = await storage.getUserByGoogleId(googleId);
          if (existingUserByGoogle) {
            logger.info("User logged in via Google OAuth", {
              userId: existingUserByGoogle.id,
              email: existingUserByGoogle.email,
            });
            return done(null, existingUserByGoogle);
          }

          // Check if user exists by email (linking OAuth to existing account)
          const existingUserByEmail = await storage.getUserByEmail(email);
          if (existingUserByEmail) {
            // Link Google account to existing user
            const updatedUser = await storage.linkGoogleAccount(existingUserByEmail.id, googleId, profileImageUrl);
            logger.info("Google account linked to existing user", {
              userId: updatedUser.id,
              email: updatedUser.email,
            });
            return done(null, updatedUser);
          }

          // Create new user with Google OAuth
          const newUser = await storage.createGoogleUser({
            email,
            googleId,
            firstName,
            lastName,
            profileImageUrl,
          });

          logger.info("New user created via Google OAuth", {
            userId: newUser.id,
            email: newUser.email,
          });

          return done(null, newUser);
        } catch (error) {
          logger.error("Google OAuth error", { error });
          return done(error as Error, undefined);
        }
      }
    )
  );

  // Serialize user to session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(new Error("User not found"), null);
      }
      done(null, user);
    } catch (error) {
      logger.error("Error deserializing user", { error });
      done(error, null);
    }
  });

  logger.info("Passport Google OAuth configured successfully");
}
