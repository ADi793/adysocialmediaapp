const { User, validate } = require("../models/user");
const { Post } = require("../models/post");
const validateObjectId = require("../middlewares/validateObjectId");
const auth = require("../middlewares/auth");
const Joi = require("joi");
const _ = require("underscore");
const Fawn = require("fawn");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();
require('express-async-errors');

Fawn.init(mongoose);

// doing stuff api
router.get("/allusers", async (req, res) => {
  const users = await User.find().select("-password -__v");

  res.send(users);
});

router.post("/users", async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let user = await User.findOne({ email: req.body.email });
  if (user) return res.status(400).send("User already registered.");

  user = new User(_.pick(req.body, ["email", "password"]));

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);

  await user.save();
  res.send(_.pick(user, ["_id", "email"]));
});

router.post("/authenticate", async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(400).send("Invalid email or password.");

  const validPassword = await bcrypt.compare(req.body.password, user.password);
  if (!validPassword) return res.status(400).send("Invalid email or password.");

  const token = user.generateAuthToken();
  res.send(token);
});

router.post("/follow/:id", [auth, validateObjectId], async (req, res) => {
  const user = await User.findById(req.params.id).select("-__v");
  if (!user) return res.status(404).send("Invalid user.");

  const isAlreadyFollowedUser =
    user.followers &&
    user.followers.find((follower) => follower._id.toString() === req.user._id);

  if (isAlreadyFollowedUser)
    return res
      .status(400)
      .send(
        `${user.email} is already followed by ${isAlreadyFollowedUser.email}.`
      );

  if (user.followers) user.followers.push(req.user);
  else user.followers = [req.user];
  user.numberOfFollowers = user.numberOfFollowers + 1;

  try {
    const userDataToBeUpdatd = { ...user._doc };
    delete userDataToBeUpdatd._id;

    Fawn.Task()
      .update("users", { _id: user._id }, userDataToBeUpdatd)
      .update(
        "users",
        { _id: new mongoose.Types.ObjectId(req.user._id) },
        {
          $inc: { numberOfFollowings: 1 },
          $push: { followings: { _id: user._id, email: user.email } },
        }
      )
      .run();

    res.send(`${user.email} is followed by ${req.user.email}.`);
  } catch (ex) {
    console.log(ex);
    res.status(500).send("An unexpected error occured.");
  }
});

router.post("/unfollow/:id", [auth, validateObjectId], async (req, res) => {
  const userToBeUnfollowed = await User.findById(req.params.id).select("-__v");
  if (!userToBeUnfollowed) return res.status(404).send("Invalid user.");

  const isUserFollowedByMe =
    userToBeUnfollowed.followers &&
    userToBeUnfollowed.followers.find(
      (follower) => follower._id.toString() === req.user._id
    );

  if (!isUserFollowedByMe)
    return res
      .status(400)
      .send("User with the given ID was not followed by you.");

  try {
    Fawn.Task()
      .update(
        "users",
        { _id: userToBeUnfollowed._id },
        {
          $inc: { numberOfFollowers: -1 },
          $pull: {
            followers: { _id: new mongoose.Types.ObjectId(req.user._id) },
          },
        }
      )
      .update(
        "users",
        { _id: new mongoose.Types.ObjectId(req.user._id) },
        {
          $inc: { numberOfFollowings: -1 },
          $pull: {
            followings: { _id: userToBeUnfollowed._id },
          },
        }
      )
      .run();
    res.send(`${userToBeUnfollowed.email} is unfollowed by ${req.user.email}.`);
  } catch (ex) {
    res.status(500).send("An unexpected error occured.");
  }
});

router.get("/user", auth, async (req, res) => {
  const user = await User.findById(req.user._id).select("-password -__v");
  if (!user) return res.status(400).send("Invalid User.");

  res.send(user);
});

router.post("/like/:id", [auth, validateObjectId], async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post)
    return res.status(404).send("The post with the given ID was not found.");

  const isAlreadyLikedByUser =
    post.likesBy &&
    post.likesBy.find((likeBy) => likeBy._id.toString() === req.user._id);

  if (isAlreadyLikedByUser)
    return res
      .status(400)
      .send("The post with the given ID was already liked by you.");

  if (post.likesBy) post.likesBy.push(req.user);
  else post.likesBy = [req.user];
  post.likes = post.likes + 1;

  await post.save();
  res.send(post);
});

router.post("/unlike/:id", [auth, validateObjectId], async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post)
    return res.status(404).send("The post with the given ID was not found.");

  const isLikedByUser =
    post.likesBy &&
    post.likesBy.find((likeBy) => likeBy._id.toString() === req.user._id);
  if (!isLikedByUser)
    return res
      .status(400)
      .send("You have not liked the post, So you are not able to unlike it.");

  const index = post.likesBy.findIndex(
    (likeBy) => likeBy._id.toString() === req.user._id
  );
  post.likesBy.splice(index, 1);
  post.likes = post.likes - 1;

  await post.save();
  res.send(post);
});

router.post("/comment/:id", [auth, validateObjectId], async (req, res) => {
  const { error } = validateComment(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const post = await Post.findByIdAndUpdate(req.params.id, {
    $push: {
      comments: {
        user: req.user,
        comment: req.body.comment,
      },
    },
  }, {
    new: true,
  });
  if (!post) return res.status(404).send('The post with the given ID was not found.');

  res.send(post);
});


router.get('/all_posts', async (req, res) => {
  const posts = await Post.find().select('_id title description created_at comments likes').sort('createdAt');
  
  return res.send(posts);
})

function validateComment(comment) {
  const schema = {
    comment: Joi.string().min(5).max(1024).required(),
  };

  return Joi.validate(comment, schema);
}

module.exports = router;
