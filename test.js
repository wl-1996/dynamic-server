const fs = require("fs");

// 读数据库(db里的user.json)
const usersString = fs.readFileSync("./db/user.json").toString();
const usersArray = JSON.parse(usersString);

// 写数据库（创建新数据写到db里的user.json里）
const user3 = { id: 3, name: "wangkuan", password: "111" };
usersArray.push(user3);
const newUsersString = JSON.stringify(usersArray);
fs.writeFileSync("./db/user.json", newUsersString);
