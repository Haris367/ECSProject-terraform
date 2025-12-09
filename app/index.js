const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
 res.send({
    message: "NodeJS App deployed on ECS",
    env: process.env.NODE_ENV || "not set",
    tag: process.env.IMAGE_TAG || "not set"
  });
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});