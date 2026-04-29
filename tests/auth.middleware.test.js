import jwt from "jsonwebtoken";
import { authenticate } from "../src/middlewares/auth.middleware.js";
import { User } from "../src/models/User.js";
import { jest } from '@jest/globals';

// Mock dependencies
// 1. Create spies for the methods you want to control
const jwtVerifySpy = jest.spyOn(jwt, 'verify');
const userFindSpy = jest.spyOn(User, 'findOne');

const mockReq = (overrides = {}) => ({
  headers: {},
  cookies: {},
  ...overrides
});

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

let next;

beforeEach(() => {
  jest.clearAllMocks();
  next = jest.fn();
});

it("should return 401 if no token is provided", async () => {
  const req = mockReq();
  const res = mockRes();

  await authenticate(req, res, next);

  expect(res.status).toHaveBeenCalledWith(401);
  expect(res.json).toHaveBeenCalledWith({
    status: "error",
    message: "Authentication required"
  });
});

it("should return 401 for invalid token", async () => {
  const req = mockReq({
    headers: {
      authorization: "Bearer invalidtoken"
    }
  });
  const res = mockRes();

  jwtVerifySpy.mockImplementation(() => {
    throw new Error("Invalid token");
  });

  await authenticate(req, res, next);

  expect(res.status).toHaveBeenCalledWith(401);
  expect(res.json).toHaveBeenCalledWith({
    status: "error",
    message: "Invalid or expired access token"
  });
});

it("should authenticate using cookie token", async () => {
  const req = mockReq({
    cookies: {
      access_token: "validtoken"
    }
  });
  const res = mockRes();

  jwtVerifySpy.mockReturnValue({ userId: "123" });

  userFindSpy.mockResolvedValue({
    id: "123",
    role: "user",
    is_active: true
  });

  await authenticate(req, res, next);

  expect(req.user).toEqual({
    id: "123",
    role: "user"
  });

  expect(next).toHaveBeenCalled();
});

it("should return 401 if user not found", async () => {
  const req = mockReq({
    cookies: { access_token: "validtoken" }
  });
  const res = mockRes();

  jwtVerifySpy.mockReturnValue({ userId: "123" });

  userFindSpy.mockResolvedValue(null);

  await authenticate(req, res, next);

  expect(res.status).toHaveBeenCalledWith(401);
  expect(res.json).toHaveBeenCalledWith({
    status: "error",
    message: "User not found"
  });
});

it("should return 403 if user is inactive", async () => {
  const req = mockReq({
    cookies: { access_token: "validtoken" }
  });
  const res = mockRes();

  jwtVerifySpy.mockReturnValue({ userId: "123" });

  userFindSpy.mockResolvedValue({
    id: "123",
    role: "user",
    is_active: false
  });

  await authenticate(req, res, next);

  expect(res.status).toHaveBeenCalledWith(403);
  expect(res.json).toHaveBeenCalledWith({
    status: "error",
    message: "Account is inactive"
  });
});

it("should pass and attach user for valid token", async () => {
  const req = mockReq({
    headers: {
      authorization: "Bearer validtoken"
    }
  });
  const res = mockRes();

  jwtVerifySpy.mockReturnValue({ userId: "123" });

  userFindSpy.mockResolvedValue({
    id: "123",
    role: "admin",
    is_active: true
  });

  await authenticate(req, res, next);

  expect(req.user).toEqual({
    id: "123",
    role: "admin"
  });

  expect(next).toHaveBeenCalled();
});