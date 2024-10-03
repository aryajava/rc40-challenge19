import fs from "fs";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";

// Mendapatkan __dirname dan __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataFile = "data.json";

// Membaca data dari file JSON
const getData = () => JSON.parse(fs.readFileSync(dataFile, "utf8"));

// Menyimpan data ke file JSON
const saveData = (data) => fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));

// Merender halaman HTML dengan menggantikan placeholder menggunakan value dari params
const renderPage = (res, view, params = {}) => {
  const filePath = path.join(__dirname, "views", view);
  fs.readFile(filePath, "utf8", (err, template) => {
    if (err) return renderError(res, "Error rendering page", 500);

    // Render user table dan form jika ada
    if (params.users) params.userTable = renderUserTable(params.users);
    params.form = renderForm(params.user);

    // Mengganti placeholder dengan value dari params
    const filledTemplate = template.replace(/{{(\w+)}}/g, (_, key) => params[key] || '');

    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(filledTemplate);
  });
};

// Merender tabel
const renderUserTable = (users) => users.map((user, index) => `
  <tr>
    <td>${index + 1}</td>
    <td>${user.name}</td>
    <td>${user.height}</td>
    <td>${user.weight}</td>
    <td>${user.birthDate}</td>
    <td>${user.isMarried ? "Yes" : "Not Yet"}</td>
    <td>
      <div class="btn-column">
        <a href="/delete?id=${index}" onclick="return confirm('Apakah kamu yakin menghapus data \'${user.name}\'?')">Delete</a>&nbsp;
        <a href="/edit?id=${index}">Update</a>
      </div>
    </td>
  </tr>
`).join('');

// Merender form
const renderForm = (user = {}) => `
  <div class="box">
    <form action="" method="POST">
      <div class="">
        <input type="text" id="name" name="name" required placeholder="insert your name" value="${user.name || ''}" />
      </div>
      <div class="">
        <input type="number" id="height" name="height" required placeholder="insert your height" value="${user.height || ''}" />
      </div>
      <div class="">
        <input type="number" step="0.01" id="weight" name="weight" required placeholder="insert your weight" value="${user.weight || '0.00'}" />
      </div>
      <div class="">
        <input type="date" name="birthDate" id="birthDate" required value="${user.birthDate || ''}" />
      </div>
      <div class="">
        <select name="isMarried" id="isMarried" required>
          <option value="" style="display: none">have you married ?</option>
          <option value="true" ${user.isMarried === true ? 'selected' : ''}>True</option>
          <option value="false" ${user.isMarried === false ? 'selected' : ''}>False</option>
        </select>
      </div>
      <div class="">
        <button type="submit" class="btn-green">${user.name ? 'Update' : 'Save'}</button>
      </div>
    </form>
    <div class="">
      <a href="/">
        <button class="btn-blue">Cancel</button>
      </a>
    </div>
  </div>
`;

// Menghandle file static css
const serveStaticFiles = (req, res) => {
  const filePath = path.join(__dirname, "public", req.url);
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) return renderError(res, "File not found", 404);

    const contentType = getContentType(filePath);
    res.writeHead(200, { "Content-Type": contentType });
    res.end(fs.readFileSync(filePath));
  });
};

// Mendapatkan content type berdasarkan ekstensi file
const getContentType = (filePath) => path.extname(filePath) === ".css" ? "text/css" : "text/html";

// Mem-parsing body dari request HTTP
const parseRequestBody = (req, callback) => {
  let body = "";
  req.on("data", (chunk) => body += chunk.toString());
  req.on("end", () => {
    const params = new URLSearchParams(body);
    const parsedBody = {};
    for (const [key, value] of params.entries()) {
      parsedBody[key] = value;
    }
    callback(parsedBody);
  });
};

// Merender pesan error
const renderError = (res, message, statusCode = 404) => {
  res.writeHead(statusCode, { "Content-Type": "text/html" });
  res.end(message);
};

// Mendapatkan id dari URL
const getIdFromUrl = (url) => new URLSearchParams(url.split("?")[1]).get("id");

// Melakukan redirect
const redirect = (res, location) => {
  res.writeHead(302, { Location: location });
  res.end();
};

// Menghandle request GET
const handleGetRequest = (req, res) => {
  if (req.url.endsWith(".css")) return serveStaticFiles(req, res);

  const data = getData();
  // Menampilkan halaman beranda
  if (req.url === "/") return renderPage(res, "index.html", { users: data });
  // Menampilkan halaman tambah
  if (req.url === "/add") return renderPage(res, "add/index.html");
  // Menampilkan halaman edit
  if (req.url.startsWith("/edit")) {
    const id = getIdFromUrl(req.url);
    if (!id || !data[id]) return renderError(res, "User not found", 404);
    return renderPage(res, "edit/index.html", { user: data[id], id });
  }
  // Hapus
  if (req.url.startsWith("/delete")) {
    const id = getIdFromUrl(req.url);
    if (!id || !data[id]) return renderError(res, "User not found", 404);
    return handleDeleteRequest(req, res, data, id);
  }
  return renderError(res, "Page not found", 404);
};

// Menghandle request POST
const handlePostRequest = (req, res) => {
  const data = getData();

  // Menambahkan
  if (req.url === "/add") return handleAddUser(req, res, data);
  // Mengedit
  if (req.url.startsWith("/edit")) return handleEditUser(req, res, data);
  return renderError(res, "Page not found", 404);
};

// Menambahkan
const handleAddUser = (req, res, data) => {
  parseRequestBody(req, (newUser) => {
    newUser.isMarried = newUser.isMarried === "true";
    data.push(newUser);
    saveData(data);
    redirect(res, "/");
  });
};

// Mengedit
const handleEditUser = (req, res, data) => {
  const id = getIdFromUrl(req.url);
  parseRequestBody(req, (updatedUser) => {
    updatedUser.isMarried = updatedUser.isMarried === "true";
    data[id] = updatedUser;
    saveData(data);
    redirect(res, "/");
  });
};

// Menghapus
const handleDeleteRequest = (req, res, data, id) => {
  data.splice(id, 1);
  saveData(data);
  redirect(res, "/");
};

// Membuat server HTTP
const server = http.createServer((req, res) => {
  if (req.method === "GET") return handleGetRequest(req, res);
  if (req.method === "POST") return handlePostRequest(req, res);
  return renderError(res, "Method not allowed", 405);
});

// Menjalankan server
const port = 3000;
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});