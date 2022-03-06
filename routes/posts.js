const { validate, Post } = require("../models/post");
const auth = require("../middlewares/auth");
const validateObjectId = require("../middlewares/validateObjectId");
const _ = require("underscore");
const express = require("express");
const router = express.Router();
require('express-async-errors');

router.get('/:id', validateObjectId, async (req, res) => {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).send('The post with the given ID was not found.');

    res.send(post);
})

router.post("/", auth, async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const post = new Post(_.pick(req.body, ["title", "description"]));

  await post.save();
  res.send(_.pick(post, ["_id", "title", "description", "createdAt"]));
});

router.delete("/:id", [auth, validateObjectId], async (req, res) => {
  const post = await Post.findByIdAndRemove(req.params.id);
  if (!post)
    return res.status(404).send("The post with the given ID was not found.");

  res.send(post);
});

module.exports = router;
