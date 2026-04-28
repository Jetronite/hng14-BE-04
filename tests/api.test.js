import request from "supertest";
import app from "../src/app.js";
import mongoose from 'mongoose';

describe("API Versioning, Pagination and Filtering", () => {

  // 1. Test the Middleware
  it("should return 400 if X-API-Version header is missing", async () => {
    const res = await request(app).get("/api/profiles");
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("API version header required");
  });

  // 2. Test Pagination Format
  it("should return correct pagination metadata structure", async () => {
    const res = await request(app)
      .get("/api/profiles?page=1&limit=5")
      .set("X-API-Version", "1"); // We send the required header here

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body).toHaveProperty("total_pages");
    expect(res.body.links).toHaveProperty("next");
    expect(res.body.links).toHaveProperty("self");
  });

  // 3. Test Search Failure
  it("should return 400 for uninterpretable search queries", async () => {
    const res = await request(app)
      .get("/api/profiles/search?q=xyz123random")
      .set("X-API-Version", "1");

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Unable to interpret query");
  });

  it("filters correctly with multiple params", async () => {
    const res = await request(app)
      .get("/api/profiles?gender=male&country_id=NG")
      .set("X-API-Version", "1");

    expect(res.status).toBe(200);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });
});