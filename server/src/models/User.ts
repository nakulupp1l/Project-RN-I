import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'student' | 'company' | 'college' | 'admin';
  collegeId?: mongoose.Types.ObjectId; // Link student to college
  isFirstLogin: boolean; // <--- NEW FLAG
  matchPassword: (enteredPassword: string) => Promise<boolean>;
}

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
    collegeId: { type: Schema.Types.ObjectId, ref: 'User' }, // Reference to College
    isFirstLogin: { type: Boolean, default: false }, // Default is false for normal users
  },
  { timestamps: true }
);

UserSchema.pre('save', async function () {
  const user = this as any;
  if (!user.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);
});

UserSchema.methods.matchPassword = async function (enteredPassword: string) {
  const user = this as any;
  return await bcrypt.compare(enteredPassword, user.password);
};

const User = mongoose.model<IUser>('User', UserSchema);
export default User;