#!/usr/bin/env node

const os = require('os');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const inquirer = require('inquirer');
const findUp = require('find-up');
const homeDir = os.homedir();

let committerPath = path.join(homeDir, '.committer.json');
let committerFile;
let projects;

function setup() {
  try {
    committerFile = fs.readFileSync(committerPath, 'utf8');
    projects = JSON.parse(committerFile);
  } catch (e) {
    fs.writeFileSync(committerPath, JSON.stringify({ projects: [] }));
    committerFile = fs.readFileSync(committerPath, 'utf8');
    projects = JSON.parse(committerFile);
  }
}

let questions = [
  {
    type: 'input',
    name: 'prefix',
    message: 'Project prefix',
    validate(value) {
      if (value.length) {
        return true;
      }
      return 'Please enter a Prefix value';
    }
  },
  // {
  //   type: 'list',
  //   name: 'validation',
  //   message: 'Type of validation',
  //   choices: [{ name: 'Acquia' }, { name: 'None' }],
  // },
  {
    type: 'input',
    name: 'ticket',
    message: 'Ticket Number',
    validate(value) {
      var valid = !isNaN(parseFloat(value));
      return valid || 'Please enter ticket number';
    }
  },
  {
    type: 'input',
    name: 'message',
    message: 'Commit Message',
    validate(input) {
      var regex = /(^[^ ].{15,}\.)|(Merge branch (.)+)/;
      var valid = regex.exec(input);
      if (valid && valid.length) {
        return true;
      }
      return 'Incorret commit message';
    }
  }
  // {
  //   type: 'input',
  //   name: 'summary',
  //   message: 'Commit Summary',
  // },
];

function questionsWithDefault(project) {
  questions[0].default = project[0].prefix;
  questions[1].default = project[0].validation;
  return questions;
}

function checkIfRepo(rootPath) {
  if (!rootPath) {
    console.log("The project isn't a git repo");
    process.exit(0);
  }
  rootPath.replace('.git', '');
  return rootPath;
}

function setupQuestions(rootPath) {
  let project = projects.projects.filter(
    project => project.rootPath === rootPath
  );

  if (project.length) {
    return questionsWithDefault(project);
  }
  return questions;
}

async function inquirerSetup(questions) {
  return await inquirer.prompt(questions);
}

function saveProject({ prefix, validation }, rootPath) {
  let project = projects.projects.filter(
    project => project.rootPath === rootPath
  );
  if (project.length) {
    for (project of projects.projects) {
      if (project.prefix == prefix) {
        project.prefix = prefix;
        project.validation = validation;
        project.rootPath = rootPath;
      }
    }
  } else {
    projects.projects.push({
      prefix,
      validation,
      rootPath: rootPath
    });
  }
  fs.writeFileSync(committerPath, JSON.stringify(projects));
}

async function main() {
  let rootPath = await findUp('.git');
  checkIfRepo(rootPath);

  setup();
  let rootPathWithoutSuffix = rootPath.replace('.git', '');
  questions = setupQuestions(rootPathWithoutSuffix);
  const answers = await inquirerSetup(questions);
  saveProject(answers, rootPathWithoutSuffix);
  let commitString = `${answers.prefix}-${answers.ticket}: ${answers.message}`;

  try {
    execSync(`git commit -m "${commitString}"`);
  } catch (e) {
    console.log(`\n\n`);
    console.log(e.stdout.toString('utf8'));
    process.exit(0);
  }
}

main();
