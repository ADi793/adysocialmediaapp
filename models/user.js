const Joi = require("joi");
const _ = require("underscore");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    minlength: 5,
    maxlength: 255,
    trim: true,
    required: true,
  },
  password: {
    type: String,
    minlength: 5,
    maxlength: 1024,
    required: true,
  },
  numberOfFollowers: {
    type: Number,
    min: 0,
    default: 0,
  },
  numberOfFollowings: {
    type: Number,
    min: 0,
    default: 0,
  },
  followers: {
    type: [
      {
        _id: {
          type: mongoose.SchemaTypes.ObjectId,
          required: true,
        },
        email: {
          type: String,
          required: true,
        },
      },
    ],
    
    default: undefined,
  },
  followings: {
    type: [
      {
        _id: {
          type: mongoose.SchemaTypes.ObjectId,
          required: true,
        },
        email: {
          type: String,
          required: true,
        },
      },
    ],
    
    default: undefined,
  },
});

userSchema.methods.generateAuthToken = function () {
  const token = jwt.sign(
    _.pick(this, ["_id", "email"]),
    process.env.jwtPrivateKey
  );

  return token;
};

const User = mongoose.model("User", userSchema);

function validateUser(user) {
  const shema = {
    email: Joi.string().email().min(5).max(255).required(),
    password: Joi.string().min(5).max(255).required(),
  };

  return Joi.validate(user, shema);
}

module.exports.User = User;
module.exports.validate = validateUser;

module.exports.User = User;
