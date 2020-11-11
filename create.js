#!/usr/bin/env node
const chalk = require("chalk"); // 命令行log样式
const path = require("path");
const fs = require("fs"); // 文件读取模块
const { program } = require("commander"); // 命令行解析
const jsonFormat = require("json-format"); // json格式化

const version = require("./package").version; // 版本号

const Config = {
    // 根目录
    root: __dirname,

    // 执行命令目录路径
    dir_root: process.cwd(),

    // 小程序项目路径
    entry: "./",

    // 小程序模版目录
    template: __dirname + "/template",
};

// 全局属性
const __Data__ = {
    // 小程序项目app.json
    appJson: "",

    // 小程序所有分包
    appModuleList: {},

    // 小程序所有页面
    appPagesList: {},
};

// 解析app.json
function getAppJson() {
    const appJsonRoot = path.join(__dirname, Config.entry, "app.json");
    console.log("appJsonRoot :>> ", appJsonRoot);
    try {
        return require(appJsonRoot);
    } catch (e) {
        errorLog(`未找到app.json, 请检查当前文件目录是否正确，path: ${appJsonRoot}`);
        process.exit(1);
    }
}

// 获取文件名/模块名
function getPathSubSting(path) {
    let result = "";
    const arr = path.split("/");
    for (let i = arr.length; i > 0; i--) {
        if (arr[i]) {
            result = arr[i];
            break;
        }
    }
    return result;
}
// app.json 业务对象
const parseAppJson = () => {

    // app Json 原文件
    const appJson = __Data__.appJson = getAppJson();
    console.log("appJson :>> ", appJson);

    // 获取主包页面
    appJson.pages.forEach(path => __Data__.appPagesList[getPathSubSting(path)] = "");
    console.log("appJson.subpackages :>> ", appJson.subpackages);
    if(appJson.subpackages) {
        // 获取分包，页面列表
        appJson.subpackages.forEach(item => {
            __Data__.appModuleList[getPathSubSting(item.root)] = item.root;
            item.pages.forEach(path => __Data__.appPagesList[getPathSubSting(path)] = item.root);
        });
    }
    
};
// 设置版本号
program.version(version, "-v, --version");

/* = deal receive command
-------------------------------------------------------------- */
program
    .command("create")
    .description("创建页面或组件")
    .arguments("<type> [name] [path]")
    .action((type, name, modulePath) => {
        // 解析appJson
        parseAppJson();
        switch (type) {
            case "page":
                createPage(name, modulePath);
                break;
            case "component":
                // createComponent({ name, modulePath });
                break;
            default:
                errorLog("error");
        }
    });

program.parse(process.argv);

function successLog(msg) {
    // eslint-disable-next-line
    console.log(chalk.green(`>> ${msg}`));
}
function errorLog(msg) {
    // eslint-disable-next-line
    console.log(chalk.red(`>> ${msg}`));
}
function checkFileIsExists(path) {
    return fs.existsSync(path);
}
function createDir(src) {
    return new Promise(resolve => {
        fs.mkdir(src, { recursive: true }, err => {
            if (err) {
                throw err;
            }
            return resolve();
        });
    });
}

function readDir(path) {
    return new Promise(resolve => {
        fs.readdir(path, (err, files) => {
            if (err) {
                throw err;
            }
            return resolve(files);
        });
    });
}

function copyFile(originPath, curPath) {
    return new Promise(resolve => {
        fs.copyFile(originPath, curPath, fs.constants.COPYFILE_EXCL, err => {
            if (err) {
                throw err;
            }
            return resolve("copyFile success!!!");
        });
    });
}

// 复制批量文件
function copyFilesArr(originPath, curPath, arr) {
    const resolveFunc = async resolve => {
        let extName = "";
        for (let i = 0; i <= arr.length - 1; i++) {
            extName = path.extname(arr[i]);
            await copyFile(`${originPath}/${arr[i]}`, curPath + extName);
        }
        return resolve("copyFilesArr success!!!");
    };
    return new Promise(resolveFunc);
}
async function createPage(name, modulePath = "") {
    // 模版文件路径
    const templateRoot = path.join(Config.template, "/page");
    if (!checkFileIsExists(templateRoot)) {
        errorLog(`未找到模版文件, 请检查当前文件目录是否正确，path: ${templateRoot}`);
        return;
    }

    // 业务文件夹路径
    const page_root = path.join(__dirname, Config.entry, modulePath, name);
    // 查看文件夹是否存在
    const isExists = await checkFileIsExists(page_root);
    if (isExists) {
        errorLog("当前页面已存在，请重新确认, path: " + page_root);
        return;
    }

    // 创建文件夹
    await createDir(page_root);

    // 获取文件列表
    const files = await readDir(templateRoot);

    // 复制文件
    await copyFilesArr(templateRoot, `${page_root}/${name}`, files);

    // 填充app.json
    // 有问题
    // await writePageAppJson(name, modulePath);

    // 成功提示
    successLog("createPage success, path: " + page_root);
}

// 新增页面写入app.json
function writePageAppJson(name, modulePath = "") {
    return new Promise((resolve, reject) => {
        const appJson = __Data__.appJson;
        console.log('modulePath :>> ', modulePath);
        // 填充主包
        if (!modulePath) {
            appJson.pages.push(`pages/${name}/${name}`);
        } else {
            const idx = Object.values(__Data__.appModuleList).indexOf(modulePath);
            if (idx === -1) {
                errorLog("app.json不存在当前module, path: " + modulePath + " 请在app.json中配置");
                return;
            }
            appJson.subpackages[idx].pages.push(`${name}/${name}`);
        }

        // 写入文件
        fs.writeFile(`${Config.entry}/app.json`, jsonFormat(appJson), err => {
            if (err) {
                errorLog("自动写入app.json文件失败，请手动填写，并检查错误");
                reject();
            } else {
                resolve();
            }
        });
    });
}

function createComponent() {

}
