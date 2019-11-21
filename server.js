var http = require("http");
var fs = require("fs");
var url = require("url");
var port = process.argv[2];

if (!port) {
  console.log("请指定端口号好不啦？\nnode server.js 8888 这样不会吗？");
  process.exit(1);
}

var server = http.createServer(function(request, response) {
  var parsedUrl = url.parse(request.url, true);
  var pathWithQuery = request.url;
  var queryString = "";
  if (pathWithQuery.indexOf("?") >= 0) {
    queryString = pathWithQuery.substring(pathWithQuery.indexOf("?"));
  }
  var path = parsedUrl.pathname;
  var query = parsedUrl.query;
  var method = request.method;

  /******** 从这里开始看，上面不要看 ************/

  console.log("有个傻子发请求过来啦！路径（带查询参数）为：" + pathWithQuery);
  const session = JSON.parse(fs.readFileSync("./session.json").toString());

  if (path === "/sign_in" && method === "POST") {
    response.setHeader("content-Type", "text/html;charset=utf-8");
    // 读数据库(db里的user.json)
    const userString = fs.readFileSync("./db/user.json").toString();
    const userArray = JSON.parse(userString);
    const array = [];

    // 监听请求的data事件：
    request.on("data", chunk => {
      array.push(chunk); //把data的数据放到空数组里
    });
    // 监听请求的end事件：
    request.on("end", () => {
      const string = Buffer.concat(array).toString(); //把数组用buffer方法连接起来（因为原来的数组是以uft-8格式编码的，后端知识不要深究），并转变为字符串
      const obj = JSON.parse(string); //把字符串反序列化为对象这个对象里包含登陆用户的用户名和密码
      //  find() 方法返回数组中满足提供的测试函数的第一个元素的值。否则返回 undefined。
      const user = userArray.find(
        user => user.name === obj.name && user.password === obj.password
      );
      // 如果上边的find返回的是undefined，说明数据库里没有对应的用户名和密码：
      if (user === undefined) {
        response.statusCode = 400;
        response.setHeader("content-Type", "text/json;charset=utf-8");
        response.end(`{"errorCode":4001}`);
      } else {
        response.statusCode = 200;
        // mdn:响应首部 Set-Cookie 被用来由服务器端向客户端(浏览器)发送 cookie。
        //方：Cookie是服务器下发给浏览器的一段字符串，浏览器必须保存这个Cookie（除非用户删除），之后发起相同二级域名请求（任何请求）时，浏览器必须附上Cookie（附到请求头里）
        // 为了防止用户修改user_id,需要把cookie改一下：
        const random = Math.random();
        session[random] = { user_id: user.id };
        fs.writeFileSync("./session.json", JSON.stringify(session));
        response.setHeader("Set-Cookie", `session_id=${random}; HttpOnly`);
        response.end();
      }
      response.end();
    });
  } else if (path === "/home.html") {
    // 如果网民是通过sign_in.html登陆进来的，那么就能获取到cookie：
    const cookie = request.headers["cookie"];
    let sessionId;
    try {
      // 以下几行代码通过split filter indexOf 方法最终拿到Cookie里的登陆用户的id：
      //split() 方法使用指定的分隔符字符串将一个String对象分割成子字符串数组，以一个指定的分割字串来决定每个拆分的位置。
      // filter() 方法创建一个新数组, 其包含通过所提供函数实现的测试的所有元素。
      // indexOf()方法返回在数组中可以找到一个给定元素的第一个索引，如果不存在，则返回-1。
      sessionId = cookie
        .split(";")
        .filter(s => s.indexOf("session_id=") >= 0)[0]
        .split("=")[1];
    } catch (error) {}
    if (sessionId && session[sessionId]) {
      //如果sessionId存在，就进行下一步：
      const userId = session[sessionId].user_id;
      // 读数据库(db里的user.json)
      const userString = fs.readFileSync("./db/user.json").toString();
      const userArray = JSON.parse(userString);
      //  find() 方法返回数组中满足提供的测试函数的第一个元素的值。否则返回 undefined。这里是找到数据库里user.id和cookie存储的userId相同的user对象
      const user = userArray.find(user => user.id === userId);
      const homeHtml = fs.readFileSync("./public/home.html").toString();
      let string;
      if (user) {
        string = homeHtml
          .replace("{{loginStatus}}", "已登陆")
          .replace("{{user.name}}", user.name);
      } else {
        string = "";
      }
      response.write(string);
    } else {
      const homeHtml = fs.readFileSync("./public/home.html").toString();
      const string = homeHtml
        .replace("{{loginStatus}}", "未登陆")
        .replace("{{user.name}}", "");
      response.write(string);
    }
    response.end();
  } else if (path === "/register" && method === "POST") {
    response.setHeader("content-Type", "text/html;charset=utf-8");
    // 读数据库(db里的user.json)
    const userString = fs.readFileSync("./db/user.json").toString();
    const userArray = JSON.parse(userString);
    const array = [];

    // 监听请求的data事件：
    request.on("data", chunk => {
      array.push(chunk); //把data的数据放到空数组里
    });
    // 监听请求的end事件：
    request.on("end", () => {
      const string = Buffer.concat(array).toString(); //把数组用buffer方法连接起来（因为原来的数组是以uft-8格式编码的，后端知识不要深究），并转变为字符串
      const obj = JSON.parse(string); //把字符串反序列化为对象
      //把上边得到的注册用户的所有数据放到一个新对象里：
      const lastUser = userArray[userArray.length - 1]; //获取现有数据库里最后一个用户
      const newUser = {
        id: lastUser ? lastUser.id + 1 : 1, //如果最后一个用户存在（即数据库不为空），那么新注册用户的id为：数据库里现有的最后一个用户的id加1；否则id就是1
        name: obj.name,
        password: obj.password
      };
      // 然后把新对象写到数据库里：
      userArray.push(newUser);
      fs.writeFileSync("./db/user.json", JSON.stringify(userArray));
      response.end();
    });
    response.end("很好");
  } else {
    response.statusCode = 200;
    // 默认首页,如果path === '/'，那么就把/index.html赋值给filePath,否则仍把path赋值给filePath
    const filePath = path === "/" ? "/index.html" : path;
    // 获取最后一次出现.的索引
    const index = filePath.lastIndexOf(".");
    // substring() 方法返回一个字符串在开始索引到结束索引之间的一个子集, 或从开始索引直到字符串的末尾的一个子集。
    const suffix = filePath.substring(index);
    const fileTypes = {
      ".html": "text/html",
      ".css": "text/css",
      ".js": "text/javascript",
      ".png": "image/png",
      ".jpg": "image/jpeg"
    };
    response.setHeader(
      "Content-Type",
      `${fileTypes[suffix] || `text/html`};charset=utf-8`
    );
    console.log(suffix);
    let content;
    // try...catch语句标记要尝试的语句块，并指定一个出现异常时抛出的响应。
    try {
      content = fs.readFileSync(`./public${filePath}`);
    } catch (error) {
      content = "文件不存在";
      response.statusCode = 404;
    }
    // 把content写到页面上：
    response.write(content);
    response.end();
  }

  /******** 代码结束，下面不要看 ************/
});

server.listen(port);
console.log(
  "监听 " +
    port +
    " 成功\n请用在空中转体720度然后用电饭煲打开 http://localhost:" +
    port
);
