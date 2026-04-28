import mongoose from 'mongoose';
import { findOrCreateUser } from '../src/services/user.service.js';
import { User } from '../src/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

describe('User Service - findOrCreateUser', () => {

  // NEW: Connect to DB before running tests
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }
  });

  // Clean up the database after tests
  afterAll(async () => {
    await User.deleteMany({ github_id: { $in: ['998877', '123456'] } });
    await mongoose.connection.close();
  });

  const mockGithubProfile = {
    id: '998877',
    login: 'testuser',
    avatar_url: 'https://github.com/images/error.png',
    email: 'test@example.com'
  };

  it('should create a new user if github_id does not exist', async () => {
    const user = await findOrCreateUser(mockGithubProfile);

    expect(user).toBeDefined();
    expect(user.github_id).toBe('998877');
    expect(user.username).toBe('testuser');
    expect(user.role).toBe('analyst'); // Check default role
  });

  it('should update the existing user if github_id already exists', async () => {
    // Modify the "GitHub" data slightly (e.g., new avatar)
    const updatedProfile = {
      ...mockGithubProfile,
      avatar_url: 'https://new-photo.com/img.jpg'
    };

    const user = await findOrCreateUser(updatedProfile);

    expect(user.github_id).toBe('998877');
    expect(user.avatar_url).toBe('https://new-photo.com/img.jpg');

    // Check that we didn't create a second user
    const count = await User.countDocuments({ github_id: '998877' });
    expect(count).toBe(1);
  });

  it('should update the username if a returning user has changed it on GitHub', async () => {
    // 1. Create initial user
    const mockGithubUser = {
      id: "123456",
      login: "testuser",
      avatar_url: "https://avatar.com/img.png",
      email: "test@example.com"
    };
    await findOrCreateUser(mockGithubUser);

    // 2. Simulate login with a new username but SAME github_id
    const updated = await findOrCreateUser({
      ...mockGithubUser,
      login: "newname"
    });

    // 3. Verify
    expect(updated.username).toBe("newname");

    // 4. Verify we still only have ONE user in the database
    const count = await User.countDocuments({ github_id: "123456" });
    expect(count).toBe(1);
  });
});