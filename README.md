# README

This is a developer CLI designed to automate common developer tasks.
It solves the following problems:

1. **[Commit helper]** Automates git add, commit, branch checkout, PR creation
2. **[Project templates]** Allows you to create project templates and then generate project boilerplates for new projects

## Install, update

Install:
`npm install -g @js20/automate-cli`

Update:
`npm update -g @js20/automate-cli`

You should now have a global command `emp` that you can run like:
`emp --help`

## High level commands
Use `emp --help` to list all commands. Add flag `--debug` to debug things like writing files with the `new` command.

## 1. Commit helper
Run `emp commit`, the CLI will ask relevant questions and perform actions, while logging exactly what it is doing behind the scenes.


## 2. Project templates

The `emp new` command is designed to help you automatically create new project templates for when creating a new coding repository. A project template is basically a boilerplate with a collection of relevant files to quickly get started with a new project (think create-react-app but for any project). A project templates can contain any files and you can make many templates for different use cases. For instance if you want a template for a node app you can fill the template with files like webpack, babel, package.json and some basic code files with hello world logic.

The first step to use templates is to setup one or more "template roots", which is a directory where your templates are located. Each template root can have any file structure, but it is required that you have a file called "templates.json" in the root of the directory.

So for instance if I want my project templates in a folder like `~/development/templates` I have to provide a file `~/development/templates/templates.json`.

The templates.json file provides all info about different questions and choices the user can do when installing the template.

The templates.json file should be an array of ITemplate objects. The specification for the ITemplate object is found in `src/types.ts`.

Here is an example of a template:

```json
[
    {
        "name": "backend",
        "questions": [
            {
                "type": "string",
                "question": "What is your project name?",
                "variable": "$projectName$"
            },
            {
                "type": "boolean",
                "question": "Do you want user authentication?",
                "variable": "$shouldUseAuth$"
            }
        ],
        "files": [
            {
                "path": "./backend/general"
            },
            {
                "path": "./backend/auth",
                "includeIf": "$shouldUseAuth$"
            }
        ]
    }
]
```

File structure:

```
templates
    backend
        auth
            src
                > auth.js
        general
            src
                > index.js
            > _.env
            > _.gitignore
            > _tsconfig.json
            > package.json
            > webpack-dev.config.js
    > templates.json
```

If the user answers yes to auth, the final file structure for the new project will be:

```
    src
        > auth.js
        > index.js
    > .env
    > .gitignore
    > package.json
    > tsconfig.json
    > webpack-dev.config.js
```

### User questions

You can ask any questions to the user while installing the template to make different decisions. We can choose whether to ask for a string or yes/no boolean. We define the questions, and define what the variable name should be. You can choose any format of variable names, e.g. `$projectName$` or `###projectName` or whatever format you want.

### Different files depending on answers

As you can see in the example above we can add multiple paths in the "files" array. The first one with only a path will always be included and all the files in that directory will be added to your new project. The second one with "includeIf" will only add the included files if the answer to the auth question `$shouldUseAuth$` is true.

### Replacing values in files

You can use any variable inside the files of your template, and the system will automatically replace all the variables with the value the user chose. So for instance we ask for the name of the package, and in the package.json file we can then reference the variable like this:

```json
{
    "name": "$projectName$"
}
```

If the user answers "test" the package.json will automatically be:

```json
{
    "name": "test"
}
```

### Hidden files

If you add an underscore at the start of a file name it will always be removed. So `_.gitignore` will become `.gitignore`, `_tsconfig.json` will become `tsconfig.json` etc. This is to allow you to prevent these files from having any effect on your templates, for instance if you push the template to git and want to prevent the gitignore behaviour.

### If statements

Inside files you can at any point do if statements based on answers. You can start an if statement with the following format:

`-- if [variable] === [value] --`

The `[variable]` should reference one of your variables, and the `[value]` should be `true` or `false`. You then end the if statement with the following:

`-- endif --`

You can put the start and end of if statement anywhere on a line in your file, so you can put it in a comment for JS files, which will prevent errors in the file:

```ts
const otherLogic = () => {};

//-- if $shouldUseAuth$ === true --

const login = () => {
    //Auth logic
};

//-- endif --

const moreLogic = () => {};
```

But it can also work for JSON files:

```json
{
    "somethingElse": true,
    "-- if $shouldUseAuth$ === true --": "",
    "addThisPart": "Auth!!!",
    "-- endif --": ""
}
```

The lines containing the if start or if end will always be removed, so the results will be like this if shoulldUseAuth is true:

The JS file:

```ts
const otherLogic = () => {};

const login = () => {
    //Auth logic
};

const moreLogic = () => {};
```

And the JSON:

```json
{
    "somethingElse": true,
    "addThisPart": "Auth!!!"
}
```

If the answer was false, the result will be:

The JS file:

```ts
const otherLogic = () => {};

const moreLogic = () => {};
```

And the JSON:

```json
{
    "somethingElse": true
}
```

**Note:** For JSON files any trailing commas will automatically be removed. So we don't get a broken JSON file `"somethingElse": true,` with a trailing comma because the system has automatically fixed that error for us.

#### Conditional questions

You can use the `askIf` field for a question to only ask for user input if another question was answered true, like this:

```json
{
    //... rest of templates.json
    "questions": [
        {
            "type": "boolean",
            "question": "Do you want user authentication?",
            "variable": "$shouldUseAuth$"
        },
        {
            "type": "boolean",
            "question": "Do you want an admin role?",
            "askIf": "$shouldUseAuth$",
            "variable": "$shouldUseAdmin$"
        }
    ]
}
```

If the user answers no on the first question the second question will never be asked. All occurences of `$shouldUseAdmin$` in your project will be replaced with an empty string `''`.

#### Generated variables

You can use `generated` to provide variables that are automatically generated for the user.

```json
{
    //... rest of templates.json
    "generated": [
        {
            "type": "cryptoSecret",
            "variable": "$devJwtSecret$"
        }
    ]
}
```

In the scenario if you place `$devJwtSecret$` in your template file it will get an automatically generated crypto secret. Please consider `src/types.ts` and `GeneratedVariableType` for all types of generated variables that are available.
