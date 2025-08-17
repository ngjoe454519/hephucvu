// Tham chiếu thư viện http của node
import http from "http";
// Tham chiếu thư viện File của node (fs)
import fs from "fs";

// Tham chiếu đến tập tin .env
import dotenv from "dotenv";
dotenv.config();

// Khai báo cổng cho dịch vụ từ tập tin .env
const port = process.env.PORT;

// Tham chiếu thư viện MongoDB
import db from "./libs/mongoDB.js"; 

// Cấu hình Dịch vụ
const server = http.createServer((req, res) => {
    
    let method = req.method;
    let url = req.url;
    // result: là chuỗi, chuỗi JSON
    let result = `Server Node JS - Method: ${method} - Url: ${url}`;
    // Cấp quyền
    res.setHeader("Access-Control-Allow-Origin", '*');
    // Trả kết quả cho Client
    if (method == "GET") {
        if (url.match("\.png$")) {
            let imagePath = `images${url}`;
            if (!fs.existsSync(imagePath)) {
                imagePath = `images/noImage.png`;
            }
            let fileStream = fs.createReadStream(imagePath);
            res.writeHead(200, { "content-type": "image/png" });
            fileStream.pipe(res);
        } else {
            res.writeHead(200, { "content-type": "text/json; charset=utf-8" });
            let collectionName = db.collectionNames[url.replace("/", "")];
            if(collectionName){
                db.getAll(collectionName)
                .then((result)=>{
                    res.end(JSON.stringify(result));
                })
                .catch((err)=>{
                    console.log(err);
                })    
            }else{
                res.end(JSON.stringify(result));
            }
        }

    } else if (method == "POST") {
        // Server Nhận dữ liệu từ client gởi vê
        let noi_dung_nhan = '';
        req.on("data", (data) => {
            noi_dung_nhan += data
        })
        // Server Xử lý dữ liệu và trả kết quả lại cho client
        if (url == "/LOGIN") {
           req.on("end", () => {
    let dataObj = JSON.parse(noi_dung_nhan);  // parse chuỗi JSON thành object
    if (dataObj.Ten_Dang_nhap === "NV_1" && dataObj.Mat_khau === "NV_1") {
      res.end("Login thành công");
    } else {
      res.end("Sai tài khoản hoặc mật khẩu");
    }
  });
        } else if (url == "/INSERT_USER") {
            req.on("end", () => {
                res.end(noi_dung_nhan)
            })
        } else {
            res.end(result)
        }
    } else if (method == "PUT") {
        // Server nhận dữ liệu gởi từ client
        let noi_dung_nhan = "";
        req.on("data", (data) => {
            noi_dung_nhan += data
        })
        // Server xử lý dữ liệu trả kết quả cho client
        if (url == "/UPDATE_USER") {
            req.on("end", () => {
                res.end(noi_dung_nhan);
            })
        } else {
            res.end(result);
        }
    } else if (method == "DELETE") {
        // Server nhận dữ liệu gởi từ client
        let noi_dung_nhan = "";
        req.on("data", (data) => {
            noi_dung_nhan += data
        })
        // Server xử lý dữ liệu trả kết quả cho client
        if (url == "/DELETE_USER") {
            req.on("end", () => {
                res.end(noi_dung_nhan);
            })
        } else {
            res.end(result);
        }
    } else {
        res.end(result);
    }

});

// Khai báo cổng cho hệ phục vụ (port web)
server.listen(port, () => {
    console.log(`Dịch vụ thực thi tại địa chỉ: http://localhost:${port}`)
})


