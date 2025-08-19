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
    // CORS headers cho mọi request
    res.setHeader("Access-Control-Allow-Origin", '*');
    res.setHeader("Access-Control-Allow-Methods", 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader("Access-Control-Allow-Headers", 'Content-Type');
    // Xử lý preflight request (OPTIONS) NGAY ĐẦU HÀM
    if (method === 'OPTIONS') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
        return;
    }
    // result: là chuỗi, chuỗi JSON
    let result = `Server Node JS - Method: ${method} - Url: ${url}`;
    // Trả kết quả cho Client
    if (method == "GET") {
        if (url === "/BAOCAO_TON_NHAP") {
            // Báo cáo tồn kho và số lượng đã nhập hàng cho từng loại
            Promise.all([
                db.getAll("tivi"),
                db.getAll("mobile"),
                db.getAll("food")
            ]).then(([tiviList, mobileList, foodList]) => {
                // Helper tính tổng số lượng nhập, bán, tồn hiện tại
                const calcTonNhapBan = (arr) => {
                    let nhap = 0;
                    let ban = 0;
                    arr.forEach(item => {
                        // Số lượng đã nhập: tổng So_luong trong Danh_sach_Phieu_Nhap
                        if (Array.isArray(item.Danh_sach_Phieu_Nhap)) {
                            nhap += item.Danh_sach_Phieu_Nhap.reduce((acc, phieu) => acc + (phieu.So_luong || 0), 0);
                        }
                        // Số lượng đã bán: tổng So_luong trong Danh_sach_Phieu_Ban
                        if (Array.isArray(item.Danh_sach_Phieu_Ban)) {
                            ban += item.Danh_sach_Phieu_Ban.reduce((acc, phieu) => acc + (phieu.So_luong || 0), 0);
                        }
                    });
                    let hien_tai = nhap - ban;
                    return { hien_tai, nhap, ban };
                };
                const tivi = calcTonNhapBan(tiviList);
                const mobile = calcTonNhapBan(mobileList);
                const food = calcTonNhapBan(foodList);
                const report = { tivi, mobile, food };
                res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
                res.end(JSON.stringify(report));
            }).catch(err => {
                res.writeHead(500, { "content-type": "application/json; charset=utf-8" });
                res.end(JSON.stringify({ error: err.message || err }));
            });
            return;
        } else if (url === "/BAOCAO_TONGSO") {
            // Báo cáo tổng số lượng các loại (tivi, mobile, food, user)
            Promise.all([
                db.getAll("tivi"),
                db.getAll("mobile"),
                db.getAll("food"),
                db.getAll("user")
            ]).then(([tiviList, mobileList, foodList, userList]) => {
                const tivi = tiviList.length;
                const mobile = mobileList.length;
                const food = foodList.length;
                const user = userList.length;
                const report = { tivi, mobile, food, user };
                res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
                res.end(JSON.stringify(report));
            }).catch(err => {
                res.writeHead(500, { "content-type": "application/json; charset=utf-8" });
                res.end(JSON.stringify({ error: err.message || err }));
            });
            return;
        } else if (url === "/BAOCAO_DATHANG") {
            // Báo cáo tổng hợp số lượng phiếu đặt hàng của từng loại
            Promise.all([
                db.getAll("tivi"),
                db.getAll("mobile"),
                db.getAll("food")
            ]).then(([tiviList, mobileList, foodList]) => {
                const sumPhieu = arr => arr.reduce((acc, cur) => acc + (cur.Danh_sach_Phieu_Dat ? cur.Danh_sach_Phieu_Dat.length : 0), 0);
                const tivi = sumPhieu(tiviList);
                const mobile = sumPhieu(mobileList);
                const food = sumPhieu(foodList);
                const tong = tivi + mobile + food;
                const report = { tivi, mobile, food, tong };
                res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
                res.end(JSON.stringify(report));
            }).catch(err => {
                res.writeHead(500, { "content-type": "application/json; charset=utf-8" });
                res.end(JSON.stringify({ error: err.message || err }));
            });
            return;
        } else if (url.match("\.png$")) {
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
                // Thêm thư viện cors (nếu dùng Express, còn nếu không thì thêm header thủ công như bên dưới)
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
                let _to = "dmcl.sadec@gmail.com";
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
        } else if (url == "/INSERT_MOBILE") {
            // Server Xử lý và Trả kết quả lại cho Client
            req.on("end", () => {
                let kq = {
                    "noi_dung": true
                }
                let new_document = JSON.parse(noi_dung_nhan);
                db.insertOne("mobile", new_document).then((result) => {
                    console.log(result)
                    res.end(JSON.stringify(kq));
                }).catch((err) => {
                    console.error("Error Insert User: ", err)
                    kq.noi_dung = false;
                    res.end(JSON.stringify(kq));
                })

            })

        } else if (url == "/UPLOAD_IMG_MOBILE") {
            req.on('end', function () {
                let img = JSON.parse(noi_dung_nhan);
                let kq = { "noi_dung": true };
                // upload img in images Server ------------------------------
                let kqImg = saveMedia(img.name, img.src)
                if (kqImg == "OK") {
                    res.writeHead(200, { "Content-Type": "text/json; charset=utf-8" });
                    res.end(JSON.stringify(kq));
                } else {
                    kq.noi_dung = false
                    res.writeHead(200, { "Content-Type": "text/json; charset=utf-8" });
                    res.end(JSON.stringify(kq));
                }
            })

        } else if (url == "/INSERT_USER") {
            req.on("end", () => {
                let kq = { "Noi_dung": true };
                try {
                    let newUser = JSON.parse(noi_dung_nhan);
                    db.insertOne("user", newUser).then((result) => {
                        console.log("[INSERT_USER] Kết quả:", result);
                        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
                        res.end(JSON.stringify(kq));
                    }).catch((err) => {
                        console.error("Error Insert User: ", err);
                        kq.Noi_dung = false;
                        kq.error = err.message || err;
                        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
                        res.end(JSON.stringify(kq));
                    });
                } catch (err) {
                    console.error("Error Parse Insert User: ", err);
                    kq.Noi_dung = false;
                    kq.error = "Dữ liệu gửi lên không phải JSON hợp lệ";
                    res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
                    res.end(JSON.stringify(kq));
                }
            });
        } else if (url == "/UPLOAD_IMG_User") {
            req.on('end', function () {
                let img = JSON.parse(noi_dung_nhan);
                let kq = { "noi_dung": true };
                // upload img in images Server ------------------------------
                let kqImg = saveMedia(img.name, img.src)
                if (kqImg == "OK") {
                    res.writeHead(200, { "Content-Type": "text/json; charset=utf-8" });
                    res.end(JSON.stringify(kq));
                } else {
                    kq.noi_dung = false
                    res.writeHead(200, { "Content-Type": "text/json; charset=utf-8" });
                    res.end(JSON.stringify(kq));
                }
            })

        } else if (url == "/INSERT_TIVI") {
            req.on("end", () => {
                let kq = { "Noi_dung": true };
                try {
                    let newTivi = JSON.parse(noi_dung_nhan);
                    db.insertOne("tivi", newTivi).then((result) => {
                        console.log("[INSERT_TIVI] Kết quả:", result);
                        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
                        res.end(JSON.stringify(kq));
                    }).catch((err) => {
                        console.error("Error Insert Tivi: ", err);
                        kq.Noi_dung = false;
                        kq.error = err.message || err;
                        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
                        res.end(JSON.stringify(kq));
                    });
                } catch (err) {
                    console.error("Error Parse Insert Tivi: ", err);
                    kq.Noi_dung = false;
                    kq.error = "Dữ liệu gửi lên không phải JSON hợp lệ";
                    res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
                    res.end(JSON.stringify(kq));
                }
            });
        } else if (url == "/UPLOAD_IMG_TIVI") {
            req.on('end', function () {
                let img = JSON.parse(noi_dung_nhan);
                let kq = { "noi_dung": true };
                // upload img in images Server ------------------------------
                let kqImg = saveMedia(img.name, img.src)
                if (kqImg == "OK") {
                    res.writeHead(200, { "Content-Type": "text/json; charset=utf-8" });
                    res.end(JSON.stringify(kq));
                } else {
                    kq.noi_dung = false
                    res.writeHead(200, { "Content-Type": "text/json; charset=utf-8" });
                    res.end(JSON.stringify(kq));
                }
            })

        } else if (url == "/INSERT_FOOD") {
            req.on("end", () => {
                let kq = { "Noi_dung": true };
                try {
                    let newFood = JSON.parse(noi_dung_nhan);
                    db.insertOne("food", newFood).then((result) => {
                        console.log("[INSERT_FOOD] Kết quả:", result);
                        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
                        res.end(JSON.stringify(kq));
                    }).catch((err) => {
                        console.error("Error Insert Food: ", err);
                        kq.Noi_dung = false;
                        kq.error = err.message || err;
                        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
                        res.end(JSON.stringify(kq));
                    });
                } catch (err) {
                    console.error("Error Parse Insert Food: ", err);
                    kq.Noi_dung = false;
                    kq.error = "Dữ liệu gửi lên không phải JSON hợp lệ";
                    res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
                    res.end(JSON.stringify(kq));
                }
            });
        } else if (url == "/UPLOAD_IMG_FOOD") {
            req.on('end', function () {
                let img = JSON.parse(noi_dung_nhan);
                let kq = { "noi_dung": true };
                // upload img in images Server ------------------------------
                let kqImg = saveMedia(img.name, img.src)
                if (kqImg == "OK") {
                    res.writeHead(200, { "Content-Type": "text/json; charset=utf-8" });
                    res.end(JSON.stringify(kq));
                } else {
                    kq.noi_dung = false
                    res.writeHead(200, { "Content-Type": "text/json; charset=utf-8" });
                    res.end(JSON.stringify(kq));
                }
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
                let kq = { "Noi_dung": true };
                try {
                    let userUpdate = JSON.parse(noi_dung_nhan);
                    console.log("[UPDATE_USER] Dữ liệu nhận được:", userUpdate);
                    // Không kiểm tra Ten_Dang_nhap, cho phép client tự truyền điều kiện và dữ liệu update
                    if (!userUpdate.condition || !userUpdate.update) {
                        kq.Noi_dung = false;
                        kq.error = "Thiếu trường condition hoặc update";
                        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
                        res.end(JSON.stringify(kq));
                        return;
                    }
                    db.updateOne("user", userUpdate.condition, userUpdate.update).then(result => {
                        if (result.modifiedCount === 0) {
                            kq.Noi_dung = false;
                            kq.error = "Không tìm thấy user hoặc không có gì thay đổi";
                        }
                        console.log("[UPDATE_USER] Kết quả:", result);
                        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
                        res.end(JSON.stringify(kq));
                    }).catch(err => {
                        console.error("Error Update User: ", err);
                        kq.Noi_dung = false;
                        kq.error = err.message || err;
                        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
                        res.end(JSON.stringify(kq));
                    });
                } catch (err) {
                    console.error("Error Parse Update User: ", err);
                    kq.Noi_dung = false;
                    kq.error = "Dữ liệu gửi lên không phải JSON hợp lệ";
                    res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
                    res.end(JSON.stringify(kq));
                }
            });
        } else if (url == "/UPDATE_TIVI") {
            req.on('end', function () {
                let tiviUpdate = JSON.parse(noi_dung_nhan);
                let ket_qua = { "Noi_dung": true };
                db.updateOne("tivi", tiviUpdate.condition, tiviUpdate.update).then(result => {
                    if (result.modifiedCount === 0) {
                        ket_qua.Noi_dung = false;
                        ket_qua.error = "Không tìm thấy tivi hoặc không có gì thay đổi";
                    }
                    console.log("[UPDATE_TIVI] Kết quả:", result);
                    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
                    res.end(JSON.stringify(ket_qua));
                }).catch(err => {
                    console.log("Error Update Tivi: ", err);
                    ket_qua.Noi_dung = false;
                    ket_qua.error = err.message || err;
                    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
                    res.end(JSON.stringify(ket_qua));
                })
            })
        } else if (url == "/UPDATE_FOOD") {
            req.on('end', function () {
                let foodUpdate = JSON.parse(noi_dung_nhan);
                let ket_qua = { "Noi_dung": true };
                db.updateOne("food", foodUpdate.condition, foodUpdate.update).then(result => {
                    if (result.modifiedCount === 0) {
                        ket_qua.Noi_dung = false;
                        ket_qua.error = "Không tìm thấy food hoặc không có gì thay đổi";
                    }
                    console.log("[UPDATE_FOOD] Kết quả:", result);
                    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
                    res.end(JSON.stringify(ket_qua));
                }).catch(err => {
                    console.log("Error Update Food: ", err);
                    ket_qua.Noi_dung = false;
                    ket_qua.error = err.message || err;
                    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
                    res.end(JSON.stringify(ket_qua));
                })
            })

        } // Server xử lý dữ liệu trả kết quả cho client
        else if (url == "/UPDATE_MOBILE") {
            req.on('end', function () {
                let mobileUpdate = JSON.parse(noi_dung_nhan);
                let ket_qua = { "Noi_dung": true };
                db.updateOne("mobile", mobileUpdate.condition, mobileUpdate.update).then(result => {
                    console.log(result);
                    res.writeHead(200, { "Content-Type": "text/json;charset=utf-8" });
                    res.end(JSON.stringify(ket_qua));
                }).catch(err => {
                    console.log(err);
                    ket_qua.Noi_dung = false;
                    res.writeHead(200, { "Content-Type": "text/json;charset=utf-8" });
                    res.end(JSON.stringify(ket_qua))
                })
            })
        }
        else {
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
                let kq = { noi_dung: true };
                let filter = JSON.parse(noi_dung_nhan);
                db.deleteOne("user", filter).then((result) => {
                    if (result.deletedCount === 0) {
                        kq.noi_dung = false;
                        kq.error = "Không tìm thấy user để xóa";
                    }
                    console.log("[DELETE_USER] Kết quả:", result);
                    res.end(JSON.stringify(kq));
                }).catch((err) => {
                    console.error("Error Delete User", err);
                    kq.noi_dung = false;
                    kq.error = err.message || err;
                    res.end(JSON.stringify(kq));
                })
            })
        } else if (url == "/DELETE_TIVI") {
            req.on("end", () => {
                let kq = { noi_dung: true };
                let filter = JSON.parse(noi_dung_nhan);
                db.deleteOne("tivi", filter).then((result) => {
                    if (result.deletedCount === 0) {
                        kq.noi_dung = false;
                        kq.error = "Không tìm thấy tivi để xóa";
                    }
                    console.log("[DELETE_TIVI] Kết quả:", result);
                    res.end(JSON.stringify(kq));
                }).catch((err) => {
                    console.error("Error Delete Tivi", err);
                    kq.noi_dung = false;
                    kq.error = err.message || err;
                    res.end(JSON.stringify(kq));
                })
            })
        } else if (url == "/DELETE_FOOD") {
            req.on("end", () => {
                let kq = { noi_dung: true };
                let filter = JSON.parse(noi_dung_nhan);
                db.deleteOne("food", filter).then((result) => {
                    if (result.deletedCount === 0) {
                        kq.noi_dung = false;
                        kq.error = "Không tìm thấy food để xóa";
                    }
                    console.log("[DELETE_FOOD] Kết quả:", result);
                    res.end(JSON.stringify(kq));
                }).catch((err) => {
                    console.error("Error Delete Food", err);
                    kq.noi_dung = false;
                    kq.error = err.message || err;
                    res.end(JSON.stringify(kq));
                })
            })
            req.on("end", () => {
                res.end(noi_dung_nhan);
            })
        } // Server xử lý dữ liệu trả kết quả cho client
        else if (url == "/DELETE_MOBILE") {
            // Server xử lý và trả kết quả lại client
            req.on("end", () => {
                let kq = {
                    noi_dung: true
                }
                let filter = JSON.parse(noi_dung_nhan);
                db.deleteOne("mobile", filter).then((result) => {
                    console.log(result);
                    res.end(JSON.stringify(kq));
                }).catch((err) => {
                    console.error("Error Delete Mobile", err);
                    kq.noi_dung = false;
                    res.end(JSON.stringify(kq));
                })
            })
        }
        else {
            res.end(result);
        }
    } else {
        res.writeHead(404, { "content-type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: "Not found", message: `No handler for ${method} ${url}` }));
    }

});

// Khai báo cổng cho hệ phục vụ (port web)
server.listen(port, () => {
    console.log(`Dịch vụ thực thi tại địa chỉ: http://localhost:${port}`)
})

// Upload Media -----------------------------------------------------------------
let decodeBase64Image = (dataString) => {
    var matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/),
        response = {};

    if (matches.length !== 3) {
        return new Error('Error ...');
    }

    response.type = matches[1];
    response.data = new Buffer.from(matches[2], 'base64');

    return response;
}

let saveMedia = (Ten, Chuoi_nhi_phan) => {
    var Kq = "OK"
    try {
        var Nhi_phan = decodeBase64Image(Chuoi_nhi_phan);
        // Lấy đuôi file từ chuỗi base64 nếu Ten không có đuôi
        let fileName = Ten;
        if (!/\.[a-zA-Z0-9]+$/.test(Ten)) {
            // Lấy loại file từ data:image/png;base64,...
            let match = Chuoi_nhi_phan.match(/^data:([a-zA-Z0-9\-]+)\/([a-zA-Z0-9\-]+);base64,/);
            if (match && match[2]) {
                fileName = Ten + '.' + match[2];
            }
        }
        var Duong_dan = "images//" + fileName;
        fs.writeFileSync(Duong_dan, Nhi_phan.data);
    } catch (Loi) {
        Kq = Loi.toString()
    }
    return Kq
}

