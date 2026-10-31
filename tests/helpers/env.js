process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://bish:0000@localhost:5432/enjz_test?schema=public";
process.env.JWT_SECRET = "test_jwt_secret_0123456789abcdef0123456789abcdef";
process.env.BCRYPT_ROUNDS = "4";
process.env.PORT = "3000";
