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
// Tham chiếu thư viện sendMail.js
import sendMail from "./libs/sendMail.js";
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
            if (collectionName) {
                db.getAll(collectionName)
                    .then((result) => {
                        res.end(JSON.stringify(result));
                    })
                    .catch((err) => {
                        console.log(err);
                    })
            } else {
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
                let kq = {
                    "noi_dung": true
                }
                let user = JSON.parse(noi_dung_nhan);
                let filter = {
                    $and: [
                        {
                            "Ten_Dang_nhap": user.Ten_Dang_nhap
                        },
                        {
                            "Mat_khau": user.Mat_khau
                        }
                    ]
                }
                db.getOne("user", filter).then((result) => {
                    console.log(result)
                    if (result) {
                        kq.noi_dung = {
                            Ho_ten: result.Ho_ten,
                            Nhom_Nguoi_dung: result.Nhom_Nguoi_dung
                        }
                        res.end(JSON.stringify(kq));
                    } else {
                        kq.noi_dung = false;
                        res.end(JSON.stringify(kq));
                    }

                }).catch((err) => {
                    console.error(`Error Login:`, err);
                    kq.noi_dung = false;
                    res.end(JSON.stringify(kq));
                })

            })

        } else if (url == "/DATHANG") {
            req.on("end", () => {
                // Server xử lý dữ liệu từ Client gởi về trả kết quả về lại cho Client
                let dsDathang = JSON.parse(noi_dung_nhan);
                let kq = { "noidung": [] };
                dsDathang.forEach((item) => {
                    let filter = {
                        "Ma_so": item.key
                    }
                    let collectionName = (item.nhom == 1) ? "tivi" : (item.nhom == 2) ? "mobile" : "food";
                    db.getOne(collectionName, filter).then((result) => {
                        item.dathang.So_Phieu_Dat = result.Danh_sach_Phieu_Dat.length + 1;
                        result.Danh_sach_Phieu_Dat.push(item.dathang);
                        // Update
                        let capnhat = {
                            $set: { Danh_sach_Phieu_Dat: result.Danh_sach_Phieu_Dat }
                        }
                        let obj = {
                            "Ma_so": result.Ma_so,
                            "Update": true
                        }
                        db.updateOne(collectionName, filter, capnhat).then((result) => {
                            if (result.modifiedCount == 0) {
                                obj.Update = false

                            }
                            kq.noidung.push(obj);
                            console.log(kq.noidung)
                            if (kq.noidung.length == dsDathang.length) {
                                res.end(JSON.stringify(kq));
                            }
                        }).catch((err) => {
                            console.log(err);
                        })
                    }).catch((err) => {
                        console.log(err)
                    })

                })
            })

        } else if (url == "/LIENHE") {
            req.on("end", () => {
                let thongTin = JSON.parse(noi_dung_nhan);
                let _subject = thongTin.tieude;
                let _body = thongTin.noidung;
                let kq = { "noi_dung": true };
                let _from = "admin@shop303.com.vn";
                let _to = "ltv.javascript@gmail.com";
                _body += "<hr>";
                sendMail.Goi_Thu(_from, _to, _subject, _body).then((result) => {
                    console.log(result);
                    res.end(JSON.stringify(kq));
                }).catch((err) => {
                    console.log(err);
                    kq.noi_dung = false;
                    res.end(JSON.stringify(kq));
                })
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



