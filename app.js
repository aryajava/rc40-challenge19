import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

let data = JSON.parse(fs.readFileSync("data.json", "utf8"));

const saveData = (data) => {
  fs.writeFileSync("data.json", JSON.stringify(data, null, 2));
};

app.get("/", (req, res) => {
  res.render(path.join(__dirname, "views", "index"), { users: data });
});

app.get("/add", (req, res) => {
  res.render(path.join(__dirname, "views", "add"));
});

app.post("/add", (req, res) => {
  const newUser = req.body;
  newUser.isMarried = newUser.isMarried === "true";
  data.push(newUser);
  saveData(data);
  res.redirect("/");
});

app.get("/edit/:id", (req, res) => {
  const user = data[req.params.id];
  res.render(path.join(__dirname, "views", "edit"), {
    user,
    id: req.params.id,
  });
});

app.post("/edit/:id", (req, res) => {
  const id = req.params.id;
  const updatedUser = req.body;
  updatedUser.isMarried = updatedUser.isMarried === "true";
  data[id] = updatedUser;
  saveData(data);
  res.redirect("/");
});

app.get("/delete/:id", (req, res) => {
  data.splice(req.params.id, 1);
  saveData(data);
  res.redirect("/");
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
