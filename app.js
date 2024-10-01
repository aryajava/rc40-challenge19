import fs from "fs";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = 3000;
const dataFile = "data.json";

const getData = () => JSON.parse(fs.readFileSync(dataFile, "utf8"));
const saveData = (data) =>
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));

// Render page
const renderPage = (res, view, params = {}) => {
  const filePath = path.join(__dirname, "views", view);
  // Check apakah file ada
  fs.readFile(filePath, "utf8", (err, template) => {
    if (err) return renderError(res, "Error rendering page", 500);

    const filledTemplate = replaceTemplateParams(template, params);
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(filledTemplate);
  });
};

// Mengganti parameter template
const replaceTemplateParams = (template, params) => {
  return Object.keys(params).reduce((result, key) => {
    const escapedValue = JSON.stringify(params[key]);
    const regex = new RegExp(`{{${key}}}`, "g");
    return result.replace(regex, escapedValue);
  }, template);
};

// Menghandle file static css
const serveStaticFiles = (req, res) => {
  const filePath = path.join(__dirname, "public", req.url);
  // Check apakah file ada
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) return renderError(res, "File not found", 404);

    const contentType = getContentType(filePath);
    res.writeHead(200, { "Content-Type": contentType });
    res.end(fs.readFileSync(filePath));
  });
};

// Mendapatkan content type
const getContentType = (filePath) => {
  const ext = path.extname(filePath);
  return ext === ".css" ? "text/css" : "text/html";
};

// Mem-parsing body dari request HTTP
const parseRequestBody = (req, callback) => {
  let body = "";
  req.on("data", (chunk) => (body += chunk.toString())); // chunk.toString() digunakan untuk mengubah buffer menjadi string
  req.on("end", () => {
    const params = new URLSearchParams(body);
    const parsedBody = {};
    for (const [key, value] of params.entries()) {
      parsedBody[key] = value;
    }
    callback(parsedBody);
  });
};

// Rander error
const renderError = (res, message, statusCode = 404) => {
  res.writeHead(statusCode, { "Content-Type": "text/html" });
  res.end(message);
};

// Mendapatkan id dari url
const getIdFromUrl = (url) => {
  const queryParams = new URLSearchParams(url.split("?")[1]);
  return queryParams.get("id");
};

// Fungsi redirect
const redirect = (res, location) => {
  res.writeHead(302, { Location: location }); // 302 adalah status code untuk redirect
  res.end();
};

// Handle method get
const handleGetRequest = (req, res) => {
  if (req.url.endsWith(".css")) return serveStaticFiles(req, res);

  const data = getData();

  // Routing
  if (req.url === "/") {
    // Render index
    return renderPage(res, "index.html", { users: data });
  } else if (req.url === "/add") {
    // Render add
    return renderPage(res, "add/index.html");
  } else if (req.url.startsWith("/edit")) {
    // Render edit
    const id = getIdFromUrl(req.url);
    if (!id || !data[id]) {
      return renderError(res, "User not found", 404);
    }
    const user = data[id];
    return renderPage(res, "edit/index.html", { user, id });
  } else if (req.url.startsWith("/delete")) {
    // Delete
    const id = getIdFromUrl(req.url);
    if (!id || !data[id]) {
      return renderError(res, "User not found", 404);
    }
    return handleDeleteRequest(req, res, data, id);
  } else {
    // Error
    return renderError(res, "Page not found", 404);
  }
};

// Handle method post
const handlePostRequest = (req, res) => {
  const data = getData();

  // Routing
  if (req.url === "/add") {
    return handleAddUser(req, res, data);
  } else if (req.url.startsWith("/edit")) {
    return handleEditUser(req, res, data);
  }
  return renderError(res, "Page not found", 404);
};

// Add save
const handleAddUser = (req, res, data) => {
  parseRequestBody(req, (newUser) => {
    newUser.isMarried = newUser.isMarried === "true";
    data.push(newUser);
    saveData(data);
    redirect(res, "/");
  });
};

// Edit save
const handleEditUser = (req, res, data) => {
  const id = getIdFromUrl(req.url);
  parseRequestBody(req, (updatedUser) => {
    updatedUser.isMarried = updatedUser.isMarried === "true";
    data[id] = updatedUser;
    saveData(data);
    redirect(res, "/");
  });
};

// Delete
const handleDeleteRequest = (req, res, data) => {
  const id = getIdFromUrl(req.url);
  data.splice(id, 1);
  saveData(data);
  redirect(res, "/");
};

// Buat server
const server = http.createServer((req, res) => {
  // Routing berdasarkan method
  if (req.method === "GET") {
    handleGetRequest(req, res);
  } else if (req.method === "POST") {
    handlePostRequest(req, res);
  } else {
    renderError(res, "Method not allowed", 405);
  }
});

// Listen server
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});

