import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

// 1. Define the "Shape" of a User
export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'student' | 'company' | 'college' | 'admin';
  matchPassword: (enteredPassword: string) => Promise<boolean>;
}

// 2. Create the Schema
const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { 
      type: String, 
      enum: ['student', 'company', 'college', 'admin'], 
      required: true 
    },
  },
  { timestamps: true }
);

// FIX: Removed 'next' parameter completely. 
// With async/await, we just run the code and throw errors if needed.
UserSchema.pre('save', async function () {
  const user = this as any;

  // If password is not modified, do nothing and return
  if (!user.isModified('password')) {
    return;
  }

  // Encrypt the password
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);
});

// 4. Helper method to check password
UserSchema.methods.matchPassword = async function (enteredPassword: string) {
  const user = this as any;
  return await bcrypt.compare(enteredPassword, user.password);
};

const User = mongoose.model<IUser>('User', UserSchema);
export default User;