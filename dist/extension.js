/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.activate = activate;
exports.deactivate = deactivate;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = __importStar(__webpack_require__(1));
const path = __importStar(__webpack_require__(2));
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
function activate(context) {
    let disposable = vscode.commands.registerCommand('json2dart.convert', async (uri) => {
        // 获取文件名（不带扩展名）并首字母大写
        const fileName = path.parse(uri.fsPath).name;
        const className = fileName.charAt(0).toUpperCase() + fileName.slice(1);
        // 创建输入框
        const jsonInput = await vscode.window.showInputBox({
            prompt: '请输入JSON数据',
            placeHolder: '{"key": "value"}'
        });
        if (!jsonInput)
            return;
        try {
            // 解析JSON
            const jsonData = typeof jsonInput === 'string' ? JSON.parse(jsonInput) : jsonInput;
            // 生成Dart代码
            const generatedCode = generateDartModel(className, jsonData);
            // 获取活动编辑器
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const document = editor.document;
                const fullText = document.getText();
                // 查找已存在的生成代码区域
                const startComment = '// BEGIN: Generated code';
                const endComment = '// END: Generated code';
                const startIndex = fullText.indexOf(startComment);
                const endIndex = fullText.indexOf(endComment);
                editor.edit(editBuilder => {
                    if (startIndex !== -1 && endIndex !== -1) {
                        // 替换已存在的区域
                        const range = new vscode.Range(document.positionAt(startIndex), document.positionAt(endIndex + endComment.length));
                        editBuilder.replace(range, `${startComment}\n${generatedCode}\n${endComment}`);
                    }
                    else {
                        // 在文件末尾添加新代码
                        const position = new vscode.Position(document.lineCount, 0);
                        editBuilder.insert(position, `\n${startComment}\n${generatedCode}\n${endComment}\n`);
                    }
                });
            }
        }
        catch (error) {
            vscode.window.showErrorMessage('JSON解析错误：' + error.message);
        }
    });
    context.subscriptions.push(disposable);
}
function generateDartModel(className, json, classes = new Set()) {
    let code = `class ${className} {\n`;
    const subClasses = [];
    // 生成属性
    for (const [key, value] of Object.entries(json)) {
        const type = getPropertyType(key, value, classes, subClasses);
        code += `  ${type}? ${key};\n`; // 添加 ? 使属性可空
    }
    // 生成构造函数
    code += `\n  ${className}({\n`;
    for (const [key] of Object.entries(json)) {
        code += `    this.${key},\n`; // 移除 required
    }
    code += `  });\n\n`;
    // 生成 fromJson 方法
    code += `  factory ${className}.fromJson(Map<String, dynamic> json) => ${className}(\n`;
    for (const [key, value] of Object.entries(json)) {
        const fromJsonValue = generateFromJsonValue(key, value);
        code += `    ${key}: ${fromJsonValue},\n`;
    }
    code += `  );\n\n`;
    // 生成 toJson 方法
    code += `  Map<String, dynamic> toJson() => {\n`;
    for (const [key, value] of Object.entries(json)) {
        const toJsonValue = generateToJsonValue(key, value);
        code += `    '${key}': ${toJsonValue},\n`;
    }
    code += `  };\n`;
    code += `}\n\n`;
    // 添加嵌套类
    code += subClasses.join('\n');
    return code;
}
function getPropertyType(key, value, classes, subClasses) {
    if (value === null)
        return 'dynamic';
    if (typeof value === 'string')
        return 'String';
    if (typeof value === 'number')
        return Number.isInteger(value) ? 'int' : 'double';
    if (typeof value === 'boolean')
        return 'bool';
    if (Array.isArray(value)) {
        const itemType = value.length > 0 ? getPropertyType(key, value[0], classes, subClasses) : 'dynamic';
        return `List<${itemType}>`;
    }
    if (typeof value === 'object') {
        const subClassName = key.charAt(0).toUpperCase() + key.slice(1);
        if (!classes.has(subClassName)) {
            classes.add(subClassName);
            subClasses.push(generateDartModel(subClassName, value, classes));
        }
        return subClassName;
    }
    return 'dynamic';
}
function generateFromJsonValue(key, value) {
    if (value === null)
        return `json['${key}']`;
    if (typeof value === 'object' && !Array.isArray(value)) {
        const className = key.charAt(0).toUpperCase() + key.slice(1);
        return `${className}.fromJson(json['${key}'])`;
    }
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
        const className = key.charAt(0).toUpperCase() + key.slice(1);
        return `(json['${key}'] as List).map((e) => ${className}.fromJson(e)).toList()`;
    }
    return `json['${key}']`;
}
function generateToJsonValue(key, value) {
    if (value === null)
        return key;
    if (typeof value === 'object' && !Array.isArray(value)) {
        return `${key}?.toJson()`; // 添加 ? 操作符进行空值检查
    }
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
        return `${key}?.map((e) => e.toJson()).toList()`; // 添加 ? 操作符进行空值检查
    }
    return key;
}
// This method is called when your extension is deactivated
function deactivate() { }


/***/ }),
/* 1 */
/***/ ((module) => {

module.exports = require("vscode");

/***/ }),
/* 2 */
/***/ ((module) => {

module.exports = require("path");

/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(0);
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;
//# sourceMappingURL=extension.js.map