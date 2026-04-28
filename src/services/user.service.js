import { User } from '../models/User.js';
import { v7 as uuidv7 } from 'uuid';

export const findOrCreateUser = async (githubProfile, email) => {
  const {
    id: github_id,
    login: username,
    avatar_url
  } = githubProfile;

  let user = await User.findOne({ github_id: String(github_id) });

  if (user) {
    // Update existing user
    user.username = username;
    user.avatar_url = avatar_url;
    user.email = email || user.email;
    user.last_login_at = new Date();

    await user.save();
    return user;
  }

  // Create new user
  user = await User.create({
    id: uuidv7(),
    github_id: String(github_id),
    username,
    email,
    avatar_url,
    role: "analyst",
    is_active: true,
    last_login_at: new Date()
  });

  return user;
};