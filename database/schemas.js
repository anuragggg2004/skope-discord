import mongoose from 'mongoose';

// User Warning Schema
const UserWarningSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  },
  warnings: [
    {
      reason: { type: String, required: true },
      moderatorId: { type: String, required: true },
      timestamp: { type: Date, default: Date.now }
    }
  ],
  verified: {
    type: Boolean,
    default: false
  },
  stream: {
    type: String, // 'Science', 'Commerce', 'Arts', etc.
    default: null
  }
});

// Suggestion Schema
const SuggestionSchema = new mongoose.Schema({
  suggestionId: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  },
  userId: { type: String, required: true },
  username: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'declined', 'under-review'], 
    default: 'pending' 
  },
  upvotes: { type: [String], default: [] }, // Array of user IDs
  downvotes: { type: [String], default: [] }, // Array of user IDs
  threadId: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

SuggestionSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Ticket (ModMail) Schema
const TicketSchema = new mongoose.Schema({
  channelId: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  },
  userId: { type: String, required: true },
  username: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['open', 'closed'], 
    default: 'open' 
  },
  createdAt: { type: Date, default: Date.now },
  closedAt: { type: Date },
  closedBy: { type: String }
});

// Bug Report Schema
const BugReportSchema = new mongoose.Schema({
  bugId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: { type: String, required: true },
  username: { type: String, required: true },
  title: { type: String, required: true },
  reproduceSteps: { type: String, required: true },
  expectedActual: { type: String, required: true },
  status: {
    type: String,
    enum: ['open', 'investigating', 'resolved'],
    default: 'open'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Feature Request Schema
const FeatureRequestSchema = new mongoose.Schema({
  requestId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: { type: String, required: true },
  username: { type: String, required: true },
  title: { type: String, required: true },
  usefulness: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'declined', 'under-review'],
    default: 'pending'
  },
  upvotes: { type: [String], default: [] },
  downvotes: { type: [String], default: [] },
  threadId: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const UserWarning = mongoose.model('UserWarning', UserWarningSchema);
export const Suggestion = mongoose.model('Suggestion', SuggestionSchema);
export const Ticket = mongoose.model('Ticket', TicketSchema);
export const BugReport = mongoose.model('BugReport', BugReportSchema);
export const FeatureRequest = mongoose.model('FeatureRequest', FeatureRequestSchema);
