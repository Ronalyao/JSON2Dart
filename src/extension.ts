// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('json2dart.convert', async (uri: vscode.Uri) => {
        // 获取文件名（不带扩展名）并首字母大写
        const fileName = path.parse(uri.fsPath).name;
        const className = fileName.charAt(0).toUpperCase() + fileName.slice(1);

        // 创建输入框
        const jsonInput = await vscode.window.showInputBox({
            prompt: '请输入JSON数据',
            placeHolder: '{"key": "value"}'
        });

        if (!jsonInput) return;

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
                        const range = new vscode.Range(
                            document.positionAt(startIndex),
                            document.positionAt(endIndex + endComment.length)
                        );
                        editBuilder.replace(range, `${startComment}\n${generatedCode}\n${endComment}`);
                    } else {
                        // 在文件末尾添加新代码
                        const position = new vscode.Position(document.lineCount, 0);
                        editBuilder.insert(position, `\n${startComment}\n${generatedCode}\n${endComment}\n`);
                    }
                });
            }
        } catch (error) {
            vscode.window.showErrorMessage('JSON解析错误：' + (error as Error).message);
        }
    });

    context.subscriptions.push(disposable);
}

function generateDartModel(className: string, json: any, classes: Set<string> = new Set()): string {
    let code = `class ${className} {\n`;
    const subClasses: string[] = [];

    // 生成属性
    for (const [key, value] of Object.entries(json)) {
        const type = getPropertyType(key, value, classes, subClasses);
        code += `  ${type} ${key};\n`;
    }

    // 生成构造函数
    code += `\n  ${className}({\n`;
    for (const [key] of Object.entries(json)) {
        code += `    required this.${key},\n`;
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

function getPropertyType(key: string, value: any, classes: Set<string>, subClasses: string[]): string {
    if (value === null) return 'dynamic';
    if (typeof value === 'string') return 'String';
    if (typeof value === 'number') return Number.isInteger(value) ? 'int' : 'double';
    if (typeof value === 'boolean') return 'bool';
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

function generateFromJsonValue(key: string, value: any): string {
    if (value === null) return `json['${key}']`;
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

function generateToJsonValue(key: string, value: any): string {
    if (value === null) return key;
    if (typeof value === 'object' && !Array.isArray(value)) {
        return `${key}.toJson()`;
    }
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
        return `${key}.map((e) => e.toJson()).toList()`;
    }
    return key;
}

// This method is called when your extension is deactivated
export function deactivate() {}