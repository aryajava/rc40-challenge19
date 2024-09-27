import ejs from "ejs";
import fs from "fs";
import http from "http";
import path from "path";
import querystring from "querystring";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = 3000;

const getData = () => {
  return JSON.parse(fs.readFileSync("data.json", "utf8"));
};

const saveData = (data) => {
  fs.writeFileSync("data.json", JSON.stringify(data, null, 2));
};

const renderPage = (res, view, data = {}) => {
  ejs.renderFile(path.join(__dirname, "views", view), data, {}, (err, str) => {
    if (err) {
      res.writeHead(500, { "Content-Type": "text/html" });
      res.end("Error rendering page");
      console.error(err);
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(str);
  });
};

const serveStaticFiles = (req, res) => {
  const filePath = path.join(__dirname, "public", req.url);
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/html" });
      res.end("File not found");
      return;
    }
    const ext = path.extname(filePath);
    let contentType = "text/plain";
    if (ext === ".css") {
      contentType = "text/css";
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(fs.readFileSync(filePath));
  });
};

const server = http.createServer((req, res) => {
  let data = getData();
  if (req.url.endsWith(".css")) {
    serveStaticFiles(req, res);
    return;
  }
  if (req.method === "GET" && req.url === "/") {
    renderPage(res, "index.ejs", { users: data });
  } else if (req.method === "GET" && req.url === "/add") {
    renderPage(res, "/add/index.ejs");
  } else if (req.method === "POST" && req.url === "/add") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      const newUser = querystring.parse(body);
      newUser.isMarried = newUser.isMarried === "true";
      data.push(newUser);
      saveData(data);
      res.writeHead(302, { Location: "/" });
      res.end();
    });
  } else if (req.method === "GET" && req.url.startsWith("/edit/")) {
    const id = req.url.split("/")[2];
    const user = data[id];
    renderPage(res, "/edit/index.ejs", { user, id });
  } else if (req.method === "POST" && req.url.startsWith("/edit/")) {
    const id = req.url.split("/")[2];
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      const updatedUser = querystring.parse(body);
      updatedUser.isMarried = updatedUser.isMarried === "true";
      data[id] = updatedUser;
      saveData(data);
      res.writeHead(302, { Location: "/" });
      res.end();
    });
  } else if (req.method === "GET" && req.url.startsWith("/delete/")) {
    const id = req.url.split("/")[2];
    data.splice(id, 1);
    saveData(data);
    res.writeHead(302, { Location: "/" });
    res.end();
  } else {
    res.writeHead(404, { "Content-Type": "text/html" });
    res.end("Page not found");
  }
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
