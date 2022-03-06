const Joi = require("joi");
const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  user: {
    _id: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
    email: {
      type: String,
      minlength: 5,
      maxlength: 255,
      required: true,
    },
  },
  comment: {
    type: String,
    minlength: 5,
    maxlength: 1024,
    required: true,
  }
});


const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      minlength: 2,
      maxlength: 255,
      trim: true,
      required: true,
    },
    description: {
      type: String,
      minlength: 2,
      maxlength: 5555,
      required: true,
    },
    likes: {
      type: Number,
      min: 0,
      default: 0,
    },
    likesBy: {
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
    comments: {
      type: [commentSchema],
      default: undefined,
    }
  },
  { timestamps: true }
);

const Post = mongoose.model("Post", postSchema);

function validatePost(post) {
  const schema = {
    title: Joi.string().min(2).max(255).required(),
    description: Joi.string().min(2).max(5555).required(),
  };

  return Joi.validate(post, schema);
}

module.exports.validate = validatePost;
module.exports.Post = Post;
