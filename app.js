import fs from "fs";
import path from "path";
import express from "express";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));

let data = JSON.parse(fs.readFileSync("data.json", "utf8"));

// Helper function to save data to file
const saveData = (data) => {
  fs.writeFileSync("data.json", JSON.stringify(data, null, 2));
};

// Route to display data
app.get("/", (req, res) => {
  res.render(path.join(__dirname, "views", "index"), { users: data });
});

// Route to display add form
app.get("/add", (req, res) => {
  res.render(path.join(__dirname, "views", "add"));
});

// Route to handle add form submission
app.post("/add", (req, res) => {
  const newUser = req.body;
  data.push(newUser);
  saveData(data);
  res.redirect("/");
});

// Route to display edit form
app.get("/edit/:id", (req, res) => {
  const user = data[req.params.id];
  res.render(path.join(__dirname, "views", "edit"), {
    user,
    id: req.params.id,
  });
});

// Route to handle edit form submission
app.post("/edit/:id", (req, res) => {
  const id = req.params.id;
  data[id] = req.body;
  saveData(data);
  res.redirect("/");
});

// Route to handle delete
app.get("/delete/:id", (req, res) => {
  data.splice(req.params.id, 1);
  saveData(data);
  res.redirect("/");
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});

