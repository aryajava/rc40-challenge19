import fs from "fs";
import http from "http";
import path from "path";
import querystring from "querystring";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = 3000;
const dataFile = "data.json";

const getData = () => JSON.parse(fs.readFileSync(dataFile, "utf8"));
const saveData = (data) => fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));

const renderPage = (res, view, params = {}) => {
  const filePath = path.join(__dirname, "views", view);
  fs.readFile(filePath, "utf8", (err, template) => {
    if (err) return renderError(res, "Error rendering page", 500);

    const filledTemplate = replaceTemplateParams(template, params);
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(filledTemplate);
  });
};

const replaceTemplateParams = (template, params) => {
  return Object.keys(params).reduce((result, key) => {
    const escapedValue = JSON.stringify(params[key]).replace(/</g, "\\u003c");
    const regex = new RegExp(`{{${key}}}`, "g");
    return result.replace(regex, escapedValue);
  }, template);
};

const serveStaticFiles = (req, res) => {
  const filePath = path.join(__dirname, "public", req.url);
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) return renderError(res, "File not found", 404);

    const contentType = getContentType(filePath);
    res.writeHead(200, { "Content-Type": contentType });
    res.end(fs.readFileSync(filePath));
  });
};

const getContentType = (filePath) => {
  const ext = path.extname(filePath);
  return ext === ".css" ? "text/css" : "text/plain";
};

const parseRequestBody = (req, callback) => {
  let body = "";
  req.on("data", (chunk) => (body += chunk.toString()));
  req.on("end", () => callback(querystring.parse(body)));
};

const renderError = (res, message, statusCode = 404) => {
  res.writeHead(statusCode, { "Content-Type": "text/html" });
  res.end(message);
};

const handleGetRequest = (req, res) => {
  const data = getData();

  if (req.url.endsWith(".css")) return serveStaticFiles(req, res);

  switch (req.url) {
    case "/":
      return renderPage(res, "index.html", { users: data });
    case "/add":
      return renderPage(res, "add/index.html");
    default:
      if (req.url.startsWith("/edit/")) {
        const id = getIdFromUrl(req.url);
        const user = data[id];
        return renderPage(res, "edit/index.html", { user, id });
      } else if (req.url.startsWith("/delete/")) {
        return handleDeleteRequest(req, res, data);
      }
      return renderError(res, "Page not found");
  }
};

const handlePostRequest = (req, res) => {
  const data = getData();

  if (req.url === "/add") {
    return handleAddUser(req, res, data);
  } else if (req.url.startsWith("/edit/")) {
    return handleEditUser(req, res, data);
  }
  return renderError(res, "Page not found", 404);
};

const handleAddUser = (req, res, data) => {
  parseRequestBody(req, (newUser) => {
    newUser.isMarried = newUser.isMarried === "true";
    data.push(newUser);
    saveData(data);
    redirect(res, "/");
  });
};

const handleEditUser = (req, res, data) => {
  const id = getIdFromUrl(req.url);
  parseRequestBody(req, (updatedUser) => {
    updatedUser.isMarried = updatedUser.isMarried === "true";
    data[id] = updatedUser;
    saveData(data);
    redirect(res, "/");
  });
};

const handleDeleteRequest = (req, res, data) => {
  const id = getIdFromUrl(req.url);
  data.splice(id, 1);
  saveData(data);
  redirect(res, "/");
};

const redirect = (res, location) => {
  res.writeHead(302, { Location: location });
  res.end();
};

const getIdFromUrl = (url) => url.split("/")[2];

const server = http.createServer((req, res) => {
  if (req.method === "GET") {
    handleGetRequest(req, res);
  } else if (req.method === "POST") {
    handlePostRequest(req, res);
  } else {
    renderError(res, "Method not allowed", 405);
  }
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
